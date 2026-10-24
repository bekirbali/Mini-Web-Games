# PRD — **Lanetli Demirci**

| Alan | Değer |
|---|---|
| Sürüm | 0.1 (oynanabilir v1) |
| Tarih | 2026-10-24 |
| Platform | Web — masaüstü + mobil tarayıcı |
| Stack | Vite + TypeScript + Canvas 2D + WebAudio (framework yok, asset yok) |
| Süre | Tek tur ~10-15 dakika, 3 gün |
| Kayıt | `localStorage` — sadece rekor |

---

## 1. Tek Cümle

Müşterinin eşyasını **+9'a** basmaya çalışırken her vuruşta zamanlamayı tutturduğun, her vuruşta da **ne kadar risk alacağını** seçtiğin bir demircilik oyunu.

## 2. Neden Bu Oyun

- **Kayıp atfı net.** "Barın ortasındaydı, ben kaçırdım." — sistemin sakladığı bir şey yok.
- **Aynı tuş, iki karar.** Vuruş anı beceri; vuruş öncesi duruş seçimi risk yönetimi. İkisi birbirini besliyor.
- **Kısa tur, yüksek tekrar.** 3 gün × 6 müşteri. Her tur farklı müşteri, farklı özel istek, farklı dükkân kartları, farklı müzayede.
- **Son sahne riskli.** Kendi kılıcını +9'a basmadan müzayedeye çıkamıyorsun; yanarsa tur sıfırlanıyor.

## 3. Tasarım Sütunları

1. **Okunabilirlik.** Her sayı ekranda. Hasar, ödeme, bölge genişliği, dayanıklılık.
2. **Gerilim > ceza.** Oyuncu kaybettiğinde "şanssızdım" değil "acele ettim" demeli.
3. **Tek oturumda öğrenilir.** İlk turda tüm mekanikler görülür. Sonraki turlar ustalaşma.
4. **Süs değil geri bildirim.** Kıvılcım, sarsıntı, çınlama — hepsi vuruş kalitesini anlatır.

## 4. Çekirdek Döngü

```
GÜN BAŞI
  └─ müşteri gelir (eşya + hedef tier + özel istek)
       └─ kabul / geri çevir
            └─ DURUŞ SEÇ  (temkinli / normal / cüretkâr)
                 └─ BAR BAŞLAR → VUR
                      ├─ MÜKEMMEL / SAĞLAM → tier +1, para, itibar
                      ├─ ISKA → dayanıklılık −1 (yüksek tier'da −2)
                      │    └─ dayanıklılık bitecekse KURTARMA PENCERESİ (3.4 sn)
                      └─ hedefe ulaştı → teslim → bahşiş + itibar
GÜN SONU → 3 karttan 1'i (veya hiçbiri) → ertesi gün
3. GÜN SONU → KENDİ KILICIN (+4 → +9) → MÜZAYEDE → SKOR
```

## 5. Mekanikler

### 5.1 Bar (zamanlama)

Bar, üçgen dalga ile **analitik** hareket eder; kare hızından bağımsızdır:

```ts
cycle = ((t - barStart) / 1000) * speed
x     = cycle % 1
pos   = x < 0.5 ? x * 2 : 2 - x * 2     // 0 → 1 → 0
```

- Konum `0..1`; merkez `0.5`.
- `|pos − 0.5| ≤ zoneW / 2` → **MÜKEMMEL**
- `|pos − 0.5| ≤ zoneW / 2 × goodMul` → **SAĞLAM**
- aksi halde → **ISKA**

Tier'e göre bölge ve hız:

| Tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| Bölge (`zoneW`) | .145 | .130 | .115 | .095 | .082 | .072 | .058 | .048 | .040 |
| Hız (tur/sn) | 1.00 | 1.05 | 1.12 | 1.30 | 1.45 | 1.60 | 1.90 | 2.10 | 2.35 |

Eşya türü bölgeyi ve hızı değiştirir:

| Eşya | Bölge | Hız | Ödeme | Dayanıklılık |
|---|---|---|---|---|
| Kılıç | ×1.00 | ×1.00 | ×1.00 | 3 |
| Balta | ×0.90 | ×1.00 | ×1.15 | 3 |
| Hançer | ×1.00 | ×1.10 | ×0.95 | 2 |
| Zırh | ×1.18 | ×0.95 | ×1.10 | 4 |
| Kalkan | ×1.08 | ×0.92 | ×1.00 | 4 |

### 5.2 Duruşlar

Her vuruştan **önce** seçilir; vuruş başladıktan sonra değiştirilemez.

| Duruş | Bölge | Sağlam bandı | Ödeme | İtibar cezası | Kilit |
|---|---|---|---|---|---|
| **Temkinli** | ×1.60 | ×2.20 | ×0.70 | ×0.5 | — |
| **Normal** | ×1.00 | ×1.60 | ×1.00 | ×1.0 | — |
| **Cüretkâr** | ×0.55 | ×1.00 (sadece mükemmel) | ×2.00 | ×2.0 | Tier +5'ten sonra |

- **Cüretkâr** ıskada her zaman **2 dayanıklılık** götürür (tier'den bağımsız).
- Kilit, oyuncuyu ilk turlarda "her şeyi cüretkâr bas" refleksinden korur; risk ancak riske atacak bir şey biriktikten sonra açılır.

### 5.3 Dayanıklılık ve Yanma

- Her eşyanın `dayanıklılık` puanı vardır (yukarıdaki tablo + Çelik Suyu +1).
- Iska: `−1`; tier ≥ 7 veya cüretkâr duruş: `−2`.
- Dayanıklılık `0` → **YANMA**: eşya gider, müşteri paraları almadan çıkar, itibar `−1.1 × müşteri çarpanı × duruş çarpanı`.
- Yanma turların tek bitiş sebebi değildir; itibar biterse dükkân kapanır.

### 5.4 Kurtarma Penceresi

Bir ıska eşyayı **bitirecekse** oyun durur ve 3.4 saniyelik sayaç başlar:

| Seçenek | Etki | Koşul |
|---|---|---|
| **Parşömen** | Hasarsız kurtarır | `parşömen > 0` |
| **Örsü feda et** | Hasarsız kurtarır, örs seviyesi −1 (kalıcı) | `örs seviyesi > 0` |
| **Boş ver** | Eşya yanar | — |

Süre biterse otomatik "boş ver" seçilir. Karar, sonucu önceden bilerek verilir — gizli bilgi yok.

### 5.5 Müşteriler

Gün başına **6 müşteri**. Hedef tier güne göre:

| Gün | Hedef aralığı | Not |
|---|---|---|
| 1 | +1 … +3 (+%18 sürpriz +1) | öğrenme |
| 2 | +3 … +6 | orta |
| 3 | +4 … +8 | final |

Arketipler ve ödeme çarpanları:

| Arketip | Ağırlık | Ödeme |
|---|---|---|
| Köylü | 28 | ×0.90 |
| Maceracı | 32 | ×1.00 |
| Şövalye | 22 | ×1.30 |
| Soylu | 13 | ×1.70 |
| Kraliyet | 5 | ×2.20 |

**Özel istekler** (%30 ihtimalle):

| İstek | Etki |
|---|---|
| **Gözü Kapalı** | İsabet bölgesi görünmez; bar görünür, merkez tahmin edilir |
| **Soylu Sipariş** | Ödeme ×1.6, yanmada itibar cezası ×1.5 |
| **Sabırsız Müşteri** | Bar %15 daha hızlı |
| **Fakir ama Minnettar** | Ödeme ×0.7, teslimde itibar kazancı ×1.8 |

Müşteri **geri çevrilebilir**: itibar −0.2, para yok.

### 5.6 Ekonomi

Vuruş başına komisyon (hedeflediğin tier `t`):

```
taban   = 10 × 1.35^(t−1)
ödeme   = taban × müşteri × duruş × (1 + 0.20 × tezgâh)
mükemmel= ödeme × 1.25
```

- Her vuruşta **malzeme −8 altın** (ıskada da ödenir).
- Teslimde bahşiş: `hedef × 5 × müşteri çarpanı`.
- Teslimde itibar **+0.35** (Fakir müşteride +0.63), mükemmel vuruşta **+0.12**.
- İtibar **3.0** başlar, tavan **5.0**. **0** olursa tur biter.
- **Altın = skor.** Harcadığın her altın final skorundan düşer; bu yüzden dükkân kartı almak gerçek bir takas.

### 5.7 Dükkân (gün sonu)

Gün 1 ve 2 sonunda rastgele **3 kart** sunulur; **1 tanesi** alınır veya hiçbiri alınmaz.

| Kart | Etki |
|---|---|
| **Ağır Örs** | İsabet bölgesi kalıcı +%18 |
| **Usta Körük** | Bar kalıcı %10 yavaşlar |
| **Pirinç Tezgâh** | Tüm komisyonlar +%20 |
| **Parşömen Sandığı** | +2 parşömen |
| **Çelik Suyu** | Sonraki 2 eşyada +1 dayanıklılık |
| **Şans Mumu** | Sonraki 1 ıskayı affeder |

Maliyet: `120 + 60 × (gün − 1)` altın. Kart alınmazsa altın skorda kalır.

### 5.8 Kendi Kılıcın (3. gün finali)

- Müşteri yok, komisyon yok.
- Eşya **+4** başlar, hedef **+9**, dayanıklılık **3**.
- Duruşlar ve kurtarma penceresi aynen geçerli.
- **Yanarsa tur biter**, müzayede yapılmaz — elinde sadece biriken altın kalır.

### 5.9 Müzayede

Kılıç +9'a ulaşırsa satışa çıkar. Taban değer:

```
base = 320 + 45 × mükemmel sayısı + 90 × (tier − 5)
```

- 3 alıcı; her birinin gizli bütçesi ve personası var: **agresif** (bütçe ×1.15, yüksek artış), **sabırlı** (×1.35), **cimri** (×0.85).
- Açılış fiyatı `base × 0.35`.
- Her turda fiyat %10-24 artar; bütçesi yetmeyen alıcı çekilir.
- Oyuncu **"Sat"** veya **"Bir tur daha bekle"** der.
- Tüm alıcılar çekilirse kılıç hurdacıya gider: `base × 0.15`.

Bu, turun son "risk yönetimi" sınavıdır: açgözlülük ya kazandırır ya sıfırlatır.

### 5.10 Skor ve Meta

- **Skor = tur sonundaki altın.** (Müzayede geliri altına eklenir.)
- `localStorage`:
  - `best` — en yüksek skor
  - `runs` — oynanan tur sayısı
  - `bestBlade` — en yüksek basılan kendi kılıcı
- Sunucu yok, telemetri yok, hesap yok.

## 6. Arayüz

### 6.1 Ekran Düzeni

```
┌──────────────────────────────────────────────┐
│ GÜN 2/3   ◈ 320              ✧2  ▮▮▮▯▯        │  HUD
│                                              │
│                 (canvas)                     │
│            örs + eşya + kıvılcım             │
│                                              │
│  Demir Kılıç                        +4/6     │
│  ▮▮▮ kılıç                                   │
│  ┌────────── bar ──────────┐                 │
│  │   ▓▓▓▓▓│▓▓▓▓▓           │                 │
│  └─────────────────────────┘                 │
│           MÜKEMMEL! +24 altın                │
│  [Temkinli] [Normal] [Cüretkâr]              │
└──────────────────────────────────────────────┘
```

- Canvas sadece **sahne**: arka plan, örs, eşya, parçacıklar.
- HUD, bar, butonlar, modallar **DOM** — keskin yazı, kolay erişilebilirlik.
- Bar `pointerdown` ile vurulur; klavyede `Boşluk`.

### 6.2 Geri Bildirim (juice)

| Olay | Görsel | Ses |
|---|---|---|
| Mükemmel | altın kıvılcım + 5px sarsıntı + ekran flaşı | çekiç + metal çınlaması |
| Sağlam | turuncu kıvılcım + hafif sarsıntı | çekiç |
| Iska | az kıvılcım + sarsıntı | boğuk darbe |
| Yanma | yoğun duman + 14px sarsıntı + flaş | ateş uğultusu |
| Teslim | altın parçacıklar | iki kısa çınlama |
| Tier ≥ 7 | — | kalp atışı (tempo tier ile artar) |

Bar üstünde **MÜKEMMEL / SAĞLAM / ISKA / YANDI** damgası belirir.

### 6.3 Girdi

| Ekran | Girdi |
|---|---|
| Başlık | `Enter` |
| Gün başı | `Enter` |
| Müşteri | `Enter` kabul |
| Duruş | `1` `2` `3` |
| Vuruş | `Boşluk` veya bar üstüne tık |
| Kurtarma | `1` `2` `3` |
| Dükkân | `1` `2` `3` |
| Müzayede | `S` sat, `B` bekle |

## 7. Teknik

### 7.1 Dosya Yapısı

```
demirci/
├── index.html
├── src/
│   ├── main.ts        # döngü + olay bağlama
│   ├── styles.css
│   ├── types.ts       # tipler
│   ├── config.ts      # tüm denge ve içerik tabloları
│   ├── rng.ts         # mulberry32
│   ├── save.ts        # localStorage meta
│   ├── game.ts        # durum makinesi + ekonomi + müzayede
│   ├── scene.ts       # canvas sahne + parçacıklar
│   ├── synth.ts       # WebAudio sentez
│   └── ui.ts          # DOM render + girdi
└── test/
    ├── sim.ts         # başsız durum makinesi simülasyonu
    └── visual.mjs     # puppeteer ile ekran görüntüsü turu
```

### 7.2 Durum Makinesi

`title → dayIntro → arrive → stance → strike → result → (rescue) → …`
`… → shop → dayIntro → … → ownForgeIntro → stance/strike → auction → ended`

- `game.tick(t)` sadece zamana bağlı geçişleri yönetir (`result` gecikmesi, kurtarma sayacı).
- `phaseUntil` alanı, `setTimeout` ile ilerleyen akışlarda tekrar tetiklenmeyi engellemek için `Infinity`'ye çekilir.
- UI tamamen `state`'ten türetilir; oyun DOM'a bağımlı değildir.

### 7.3 Varlık Politikası

- **Sıfır asset.** Görseller canvas path'leri, sesler WebAudio osilatörleri.
- Böylece yükleme yok, telif yok, build 40 KB.
- Font: sistem fontları. Renk paleti: kömür + altın + kızıl.

### 7.4 Test

- `npm run sim` — 5 strateji × 14 tur başsız oynanır; takılan durum, negatif skor, bitmeyen tur aranır.
- `npm run shots` — Chrome headless ile 8 ekranın görüntüsü + konsol hatası kontrolü.
- Tarayıcıda hata ayıklama kancası: `window.__game`.

## 8. Kabul Testleri

| # | Test | Beklenen |
|---|---|---|
| T1 | Bara tam merkezde vur | `MÜKEMMEL`, tier +1, ödeme ×1.25 |
| T2 | Bara merkezden uzak vur | `ISKA`, dayanıklılık −1 |
| T3 | Tier 7'de ıska | dayanıklılık −2 |
| T4 | Dayanıklılık bitecek ıska | kurtarma penceresi açılır, sayaç işler |
| T5 | Sayaç biterse | eşya yanar, itibar düşer, müşteri gider |
| T6 | Parşömenle kurtarma | parşömen −1, hasar 0 |
| T7 | Örs feda | örs seviyesi −1, sonraki vuruşlarda bölge daralır |
| T8 | Cüretkâr, tier < 5 | seçilemez |
| T9 | Cüretkâr ıska | dayanıklılık −2 |
| T10 | Hedefe ulaşma | teslim, bahşiş, itibar + |
| T11 | İtibar 0 | tur biter, skor kaydedilir |
| T12 | 3. gün sonu | kendi kılıcı +4'ten başlar |
| T13 | Kendi kılıcı yanarsa | müzayede yok, tur biter |
| T14 | Kendi kılıcı +9 | müzayede açılır, 3 alıcı |
| T15 | Tüm alıcılar çekilirse | taban ×0.15 gelir, tur biter |
| T16 | Dükkân kartı | altın düşer, etki kalıcı |
| T17 | Sekmeyi değiştir / geri dön | bar konumu zamana göre doğru (analitik) |
| T18 | Yeniden başlat | tüm durum sıfır, rekor korunur |

## 9. Yapılmayacaklar (v1)

- Çoklu dil. (Sadece Türkçe.)
- Çok oyunculu, liderlik tablosu, hesap.
- Ses dosyası / müzik.
- Maze, envanter, sonsuz mod.
- Hikâye / diyalog ağacı. Müşteri replikleri tek satır.

## 10. Sonraki Sürüm Fikirleri

1. **Lanet sistemi.** +9 basılan eşya bazen lanetlenir; müşteri geri döner.
2. **Şöhret.** Teslim edilen +9 sayısı arttıkça daha zengin müşteri gelir.
3. **Günlük meydan okuma.** Sabit seed, tek deneme, yerel rekor.
4. **Usta modu.** Bölgeler %20 dar, ödeme %50 fazla.
5. **Müşteri itibarı.** Aynı müşteri tekrar gelirse pazarlık payı.

---

## 11. Uygulama Durumu

| Alan | Durum |
|---|---|
| Bar + vuruş + duruşlar | ✅ |
| Dayanıklılık + kurtarma | ✅ |
| Müşteri üretimi + özel istekler | ✅ |
| Ekonomi + itibar | ✅ |
| Dükkân kartları | ✅ |
| Kendi kılıcı + müzayede | ✅ |
| Canvas sahne + parçacıklar | ✅ |
| WebAudio sentez | ✅ |
| Rekor kaydı | ✅ |
| Simülasyon + görsel test | ✅ |
| Mobil dokunma | ✅ (pointer events) |
| Denge ince ayarı | ⏳ gerçek oyuncu verisi bekliyor |
