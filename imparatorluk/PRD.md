# PRD — **3 Dakikalık İmparatorluk**

| Alan | Değer |
|---|---|
| Sürüm | 0.1 (oynanabilir v1) |
| Tarih | 2026-10-24 |
| Platform | Web — masaüstü + mobil tarayıcı |
| Stack | Vite + TypeScript + Canvas 2D + WebAudio (framework yok, asset yok) |
| Süre | Tek tur 180 saniye |
| Kayıt | `localStorage` — kişisel Top 10 + split rekorları |

---

## 1. Tek Cümle

Tek ekrana sığdırılmış bir mikro-RTS'te 3 köylüyle başlayıp **180 saniye içinde İmparatorluk Çağı'na** ulaş; en kısa süre liderlik tablosuna yazılır.

## 2. Neden Bu Oyun

- **Tek ekran, net karar.** Kaydırma yok. Her tıklama ya ekonomi ya savunma kararı.
- **3 dakika = düşük ceza, yüksek tekrar.** Kaybedince "bir el daha" demek 3 dakika sürer.
- **Sabit harita, sabit akınlar.** Tur ezberlenebilir; gelişme oyuncunun hızında ölçülür.
- **Split kancası.** Çağ II süresi ve rakip hayalet, "bu sefer 2 köylü fazla basacağım" dedirtir.
- **Savaş ekonomiyle yarışır.** Kule mi, köylü mü, çağ mı? Her altın tek bir yere gider.

## 3. Tasarım Sütunları

1. **Okunabilirlik.** Kaynak, süre, maliyet, akın yönü ve hedef her an ekranda.
2. **Hız > simülasyon.** Yürüme ve taşıma kısa; bekleme değil karar zamanı.
3. **Savunma yatırımı.** Akınları yok sayan oyuncu Merkez'ini kaybeder.
4. **Adil speedrun.** Harita ve dalgalar sabit; rastgelelik sadece kozmetik.
5. **Süs geri bildirimdir.** Balta sesi, altın parıltısı, boynuz, ekran sarsıntısı.

## 4. Çekirdek Döngü

```
BAŞLA — 3 köylü + Merkez + 100 odun / 40 altın
  └─ köylüleri kaynağa gönder (odun / altın / taş)
       └─ Merkez'de köylü bas (20 odun + 10 altın)
            └─ Çağ II araştır (50 odun + 25 altın)
                 └─ kule (40 odun + 15 taş) + kışla (45 odun + 10 altın)
                      └─ Çağ III / İMPARATORLUK (110 odun + 75 altın + 30 taş, 10 sn)
                           └─ ZAFER — süre kaydedilir
AKINLAR: 0:45 · 1:30 · 2:15 · 2:45 (3 sn ön uyarı + boynuz)
KAYIP: Merkez yıkılır veya 3:00 dolar
```

## 5. Ekonomi

### 5.1 Kaynaklar

| Kaynak | Yatak | Toplama | Çanta | Kullanım |
|---|---|---|---|---|
| Odun | Batı ormanı (2 yatak) | 2.0/sn | 20 | Köylü, bina, çağ |
| Altın | Doğu damarı (2 yatak) | 1.7/sn | 20 | Köylü, çağ, milis |
| Taş | Kuzey ocağı (2 yatak) | 1.6/sn | 20 | Kule, Çağ III |

- Köylü yatağa yürür, çantası dolunca Merkez'e döner. Yolculuk gerçek süre.
- Yataklar tükenir; köylü rotasyonu gerekir.
- Yeni köylü, en son atanan kaynak türüne otomatik gider (mikro yükünü azaltır).
- Boşta köylü varken kaynağa tek tık = en yakın boş köylüyü gönder.

### 5.2 Maliyetler

| Birim / teknoloji | Maliyet | Süre | Şart |
|---|---|---|---|
| Köylü | 20 odun + 10 altın | 5 sn | Merkez |
| Çağ II — Krallık | 50 odun + 25 altın | 6 sn | Merkez |
| **Çağ III — İmparatorluk** | 110 odun + 75 altın + 30 taş | 10 sn | Çağ II + kule + kışla |
| Okçu kulesi | 40 odun + 15 taş | 6 sn | — |
| Kışla | 45 odun + 10 altın | 6 sn | Çağ II |
| Milis | 25 odun + 8 altın | 4 sn | Kışla |

- Köylü limiti 10, milis limiti 8.
- İnşaat yerleştirilince en yakın köylü otomatik görevlendirilir; ikinci köylü hızlandırır.
- Çağ III tamamlandığı an zafer; süre durur.

### 5.3 Başlangıç

3 köylü, Merkez (800 HP), 100 odun, 40 altın, 0 taş. Sabit harita.

## 6. Savaş

| Dalga | Zaman | Yön | İçerik |
|---|---|---|---|
| 1 | 0:45 | Batı | 2 akıncı |
| 2 | 1:30 | Doğu | 3 akıncı + 1 savaşçı |
| 3 | 2:15 | Kuzey | 4 savaşçı + 1 şef |
| 4 | 2:45 | Güney | 6 karışık |

| Birim | HP | Hasar | Hız | Not |
|---|---|---|---|---|
| Akıncı | 55 | 5 | 42 | Hızlı, köylü avcısı |
| Savaşçı | 90 | 8 | 32 | Dengeli |
| Şef | 240 | 15 | 26 | Yavaş, yıkıcı |
| Milis | 120 | 10 | 40 | Otomatik savunma |
| Kule | 260 HP | 14 / 0.65 sn | menzil 80 | Otomatik ok |
| Köylü | 45 | 2 | 46 | Yakın tehditte kaçar |

- Akından 3 saniye önce sisin kenarında kırmızı ok ve boynuz.
- Barbarlar önce köylü/asker, sonra bina hedefler. Ganimet: 3–15 altın.
- Köylü, 55 px içinde düşman görürse Merkez'e kaçar; tehdit geçince işine döner.
- Merkez yıkılırsa tur anında biter.

## 7. Kazanma, Kaybetme, Skor

- **Zafer:** Çağ III araştırması tamamlanır.
- **Kayıp:** Merkez HP 0 veya süre 180 sn.
- **Sıralama:** Zafer süresi artan (küçük iyi). Eşitlikte öldürme → toplanan kaynak.
- **Sonuç ekranı:** süre, Çağ II split'i, en iyi süre farkı, öldürme, kayıp köylü, sıralama.

### 7.1 Liderlik Tablosu

- `localStorage` içinde kişisel Top 10.
- İsim (3–12 karakter), süre, Çağ II split'i, öldürme, tarih.
- Zaferden sonra kayıt; yeni rekor rozeti.
- Tur içinde en iyi Çağ II split'i "hayalet" olarak gösterilir.
- Tablo yereldir; hile koruması iddiası yoktur.

## 8. Kontroller

| Girdi | İşlev |
|---|---|
| Sol tık | Seç / hedefe gönder / yerleştir |
| Sürükle | Kutuyla seçim |
| Shift + tık | Seçime ekle |
| Sağ tık / Esc | İptal, seçimi bırak |
| `A` / `S` / `H` | Tüm köylüler / milisler / Merkez |
| `Q` `W` `E` | Seçili köylüleri odun / altın / taşa gönder |
| `V` | Köylü üret |
| `F` | Çağ yükselt |
| `T` / `K` | Kule / kışla yerleştir |
| `M` | Milis üret |
| `Boşluk` | Duraklat |
| `R` | Sonuç ekranında tekrar |

Mobil: dokunmatik seçim + alt aksiyon çubuğu; yatay mod önerilir.

## 9. Görsel ve Ses

- 480×270 iç çözünürlük, nearest-neighbor piksel ölçekleme.
- Prosedürel piksel sprite: köylü, milis, barbar, Merkez, kule, kışla, orman, altın, taş.
- Sisin kenarında sürüklenen duman; akın yönünde kırmızı ok.
- Seçim halkası, can barı (hasarlıyken), inşaat iskelesi, toz, kıvılcım, ok izi, ekran sarsıntısı.
- WebAudio: balta, maden, inşaat, ok, kılıç, boynuz, çağ fanfarı, zafer/yenilgi.
- Mute hatırlanır; ses ilk etkileşimde açılır.

## 10. Teknik

```
src/
  main.ts      döngü + wiring
  config.ts    tüm denge sayıları
  types.ts     FSM: IDLE / MOVING / GATHERING / BUILDING / FIGHTING / DEAD
  rng.ts
  world.ts     sabit harita + başlangıç durumu
  game.ts      DOM'suz simülasyon (fixed timestep)
  render.ts    piksel sahne + bitmap rakamlar
  input.ts     fare / dokunmatik / klavye
  ui.ts        HUD, paneller, overlay
  synth.ts     WebAudio
  save.ts      rekor + ayarlar
```

- Simülasyon 60 Hz sabit adım; kare hızından bağımsız.
- `window.__game` test kancası.
- `npm run sim` başsız denge botları; `npm run shots` puppeteer.

## 11. Kapsam Dışı (v1)

Çevrimiçi liderlik, farklı haritalar, ikinci fraksiyon, bina yükseltmeleri, günlük meydan okuma, sesli anlatım.

## 12. Başarı Kriterleri

- Boşta oynayan 3:00'te kaybeder.
- Dengeli bot 150 sn altında İmparatorluk kurar (ölçülen: 127.5 sn).
- Uzman bot 110 sn altında İmparatorluk kurar (ölçülen: 98.1 sn).
- Kulesiz savunma ilk akında ciddi hasar yer; kuleli savunma ayakta kalır.
- Tur baştan sona hatasız oynanır; tüm stratejiler sonlanır.
- Mobil 320 px genişlikte butonlar erişilebilir.
