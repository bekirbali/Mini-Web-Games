# ROADMAP — **Lanetli Demirci**

| Alan | Değer |
|---|---|
| Sürüm | 0.1 |
| Tarih | 2026-10-24 |
| İlgili dosya | `PRD.md` |
| Platform | Web (masaüstü + mobil) |
| Stack | Vite + TypeScript + Canvas 2D |
| Süre | Deadline yok — his önce, denge sonra |

---

## 0. Çalışma Kuralları

1. **Önce his, sonra içerik.** Bar + vuruş tatmin etmiyorsa müşteri eklemek anlamsız.
2. **Her faz sonunda oynanabilir build.** `npm run dev` açılıyor, tur bitiyor.
3. **Denge `config.ts`'te.** Kodda sihirli sayı yok; her ayar tek dosyada.
4. **Test iddiası ölçülür.** `npm run sim` yeşil değilse faz bitmedi.
5. **Sıfır asset.** Ses ve görsel kodla üretilir; telif ve yükleme derdi yok.
6. **Yeni fikir → §5 Fikir Kutusu.** Faz ortasında kapsama eklenmez.

**Oturum:** 2-3 saatlik blok. **Toplam:** 6 oturum (~16-18 saat).

**Global Definition of Done:**
- `npm run build` temiz, TypeScript hatası yok.
- `npm run sim` — takılan tur yok, tüm stratejiler sonlanıyor.
- `npm run shots` — konsol hatası yok.
- Tur baştan sona oynanıyor: gün 1 → müzayede → skor ekranı.

---

## 1. Faz Özeti

| Faz | Ad | Çıktı | Efor | Kapı |
|---|---|---|---|---|
| **S0** | His | Bar + vuruş + kıvılcım + ses | 1 oturum | "Vurmak güzel" |
| **S1** | Döngü | Müşteri, para, itibar, teslim | 1 oturum | Tur kendi kendine akıyor |
| **S2** | Risk | Duruşlar, dayanıklılık, kurtarma | 1 oturum | Karar vermeden vurulmuyor |
| **S3** | Gün | 3 gün, dükkân kartları | 1 oturum | Gün sonu anlamlı |
| **S4** | Final | Kendi kılıcı + müzayede + rekor | 1 oturum | Son sahne heyecanlı |
| **S5** | Cila | Mobil, denge, ses dengesi, paketleme | 1 oturum | 10-15 dk'lık tur |

---

## 2. Faz Detayları

### S0 — His (1 oturum / 2-3 saat) ✅

**Amaç:** "Bu barı tutturmanın bir zevki var mı?" sorusunu cevaplamak. Müşteri yok, para yok — sadece örs, bar ve vuruş.

**Yapıldı**
- [x] Vite + TS iskeleti, tek sayfa, canvas + DOM katmanı
- [x] Analitik bar konumu (`barPosition`) — kare hızından bağımsız
- [x] `MÜKEMMEL / SAĞLAM / ISKA` bantları
- [x] Örs + eşya çizimi (vektör), tier rengi
- [x] Kıvılcım, duman, ekran sarsıntısı, flaş
- [x] WebAudio: çekiç, çınlama, ıska, yanma, teslim
- [x] Bar üstü damga animasyonu

**Kapı:** 20 vuruşluk bir testte vuruş hissi "tok" geliyor ve ıska adil görünüyor.

---

### S1 — Döngü (1 oturum / 2-3 saat) ✅

**Amaç:** Tek vuruştan tur yapısına geçmek.

**Yapıldı**
- [x] Müşteri üretimi: arketip, eşya, hedef tier, replik
- [x] Hedef tier'ın güne göre ölçeklenmesi
- [x] Komisyon formülü + malzeme maliyeti + mükemmel primi
- [x] Teslim: bahşiş, itibar artışı
- [x] Reddetme: itibar −0.2
- [x] İtibar 0 → tur sonu
- [x] HUD: gün, altın, itibar, sarf malzemeleri
- [x] Gün başı ekranı ve gün akışı
- [x] Sonuç ekranı + yeniden başlat

**Kapı:** 1. gün 6 müşteri hiçbir yere tıklamadan akıyor, sadece duruş + vuruş gerekiyor.

---

### S2 — Risk (1 oturum / 2-3 saat) ✅

**Amaç:** Her vuruşun önüne gerçek bir karar koymak.

**Yapıldı**
- [x] 3 duruş: temkinli / normal / cüretkâr
- [x] Duruşa göre bölge, sağlam bandı, ödeme, itibar çarpanı
- [x] Cüretkâr kilidi (tier +5)
- [x] Dayanıklılık: ıskada −1, tier ≥ 7 veya cüretkârda −2
- [x] Yanma: itibar cezası, müşterinin gitmesi
- [x] Kurtarma penceresi: parşömen / örs feda / boş ver + 3.4 sn sayaç
- [x] Özel istekler: gözü kapalı, soylu, sabırsız, fakir
- [x] Tier ≥ 7 kalp atışı sesi

**Kapı:** Oyuncu "cüretkâr mı bassam" diye en az bir kez duraksıyor.

---

### S3 — Gün (1 oturum / 2-3 saat) ✅

**Amaç:** Gün sonunu bir karar noktası yapmak.

**Yapıldı**
- [x] 3 günlük yapı, gün başı atmosfer metinleri
- [x] Gün sonu dükkânı: 3 kart, 1 seçim
- [x] 6 kart: örs, körük, tezgâh, parşömen, çelik suyu, şans mumu
- [x] Kart maliyeti ve "hiçbirini alma"
- [x] Altının skor olması → harcama gerçek takas

**Kapı:** "Kartı alsam mı, altını mı saklasam" ikilemi en az bir kez yaşanıyor.

---

### S4 — Final (1 oturum / 2-3 saat) ✅

**Amaç:** Turun sonunda ayrı bir heyecan tepesi.

**Yapıldı**
- [x] Kendi kılıcı: +4 → +9, dayanıklılık 3
- [x] Yanarsa tur sonu (müzayede iptal)
- [x] Müzayede: 3 alıcı, gizli bütçe, persona
- [x] Fiyat artışı, alıcı çekilmesi, açgözlülük cezası
- [x] Skor = altın; `localStorage` rekoru
- [x] Özet ekranı: teslim, yanma, mükemmel, vuruş sayısı

**Kapı:** Müzayedede "bir tur daha" demek geriliyor.

---

### S5 — Cila ve Denge (1 oturum / 2-3 saat) 🚧

**Amaç:** Tek turu 10-15 dakikaya oturtmak ve elde tutulabilir hale getirmek.

**Yapıldı**
- [x] Mobil dokunma (`pointerdown`, `touch-action: none`)
- [x] Responsive yerleşim (560px altı)
- [x] Başsız simülasyon: 5 strateji × 14 tur
- [x] Puppeteer ile 8 ekran görüntüsü + konsol hatası kontrolü
- [x] Cüretkâr ıska cezasının sertleştirilmesi (her zaman −2)
- [x] Dükkân maliyeti, altın = skor dengesi
- [x] Overlay `backdrop-filter` artefaktının kaldırılması
- [x] Favicon, build boyutu (~40 KB)

**Kalan**
- [ ] Gerçek oyuncuyla 5 tur denge testi (hedef: tur başına 1-3 yanma)
- [ ] `prefers-reduced-motion` desteği (sarsıntı/flaş kapatma)
- [ ] Ses seviyesi / sessize alma düğmesi
- [ ] Dokunmatikte barın parmak altında kalmaması için alt boşluk kontrolü
- [ ] Tur sonu "yeniden dene" akışında rekor kırıldı bildirimi
- [ ] İlk 30 saniye için kısa ipucu katmanı (bar altında zaten var — sahne üstü ok işareti)
- [ ] Lighthouse / düşük cihaz FPS kontrolü

**Kapı:** Telefonda tek elle oynanıyor, 3 tur üst üste atılıyor, tur 15 dakikayı geçmiyor.

---

## 3. Denge Defteri

Simülasyon çıktıları (`npm run sim`, 14 tur/strateji):

| Strateji | Müzayede | Ort. skor | Yanma | Vuruş |
|---|---|---|---|---|
| perfect (hep merkez, normal) | 14/14 | ~1900 | 0.0 | 77 |
| decent (±13 ms, karışık duruş) | 14/14 | ~1700 | 0.1 | 78 |
| boldspam (±10 ms, hep cüretkâr) | 14/14 | ~2000 | 0.9 | 78 |
| sloppy (±45 ms, temkinli/normal) | 14/14 | ~1300 | 0.6-1.3 | 82 |
| careless (rastgele) | 0/14 | ~15 | 4.4 | 25 |

**Yorum:** Beceri arttıkça skor artıyor ama cüretkâr strateji bedava değil (yanma ~0.9). Rastgele oynayan 1. günde bitiyor. Hedef: gerçek oyuncuda sloppy ile decent arası bir yerde oturmak.

**Ayar noktaları:** `TIER_ZONE`, `TIER_SPEED`, `STANCES[].goodMul`, `CONFIG.burnReputation`, `CONFIG.materialCost`.

---

## 4. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Yüksek tier'da bölge okunamıyor | Haksız his | Bölge genişliği görsel olarak sabit ölçekte; gerekirse min. 0.03 taban |
| Müzayede sonu sönük | Tur finali zayıf | Alıcı personası + fiyat animasyonu; gerekirse 4. alıcı |
| Mobilde bar parmak altında | Oynanamaz | Bar alt boşluk + tam genişlik dokunma alanı |
| 3 gün tekrara düşüyor | Sıkıcı | Özel istek havuzunu genişlet, gün 3'e özel müşteri ekle |
| Cüretkâr "tek doğru seçim" oluyor | Karar ölüyor | Iskada her zaman −2 + tier 5 kilidi (uygulandı) |

---

## 5. Fikir Kutusu (v1'e girmez)

- Lanetli eşya: +9 sonrası eşya lanetlenir, müşteri 2. gün geri döner.
- Şöhret seviyesi: teslim edilen +9 sayısı arttıkça müşteri kalitesi artar.
- Günlük seed meydan okuması + yerel liderlik.
- Usta modu: bölge −%20, ödeme +%50.
- Örs odası: kazanılan altınla kalıcı kozmetik (raflar, afişler).
- İkinci el pazarı: yanan eşyaların hurdasını satma.

---

## 6. Komutlar

```bash
npm install
npm run dev      # geliştirme
npm run build    # tsc + vite build
npm run sim      # başsız denge simülasyonu
npm run shots    # puppeteer ekran görüntüleri (build + preview gerekir)
```

`npm run shots` için önce `npm run build`, sonra ayrı terminalde `npx vite preview --port 4173`.
