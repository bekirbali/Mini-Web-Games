# ROADMAP — **3 Dakikalık İmparatorluk**

| Alan | Değer |
|---|---|
| Sürüm | 0.1 |
| Tarih | 2026-10-24 |
| İlgili dosya | `PRD.md` |
| Stack | Vite + TypeScript + Canvas 2D |
| Süre | 5 oturum (~15 saat) |

> **Durum (v1):** Oynanabilir. `npm run build`, `npm run sim` ve `npm run shots` yeşil; 11 ekran görüntüsü `test/shots/` altında. Son insan eliyle turu kullanıcı doğrulamasına bırakıldı.

---

## 0. Çalışma Kuralları

1. **Önce his, sonra içerik.** Tıklama + toplama tatmin etmiyorsa çağ eklemek anlamsız.
2. **Her faz sonunda oynanabilir build.**
3. **Denge `config.ts`'te.** Sihirli sayı yok.
4. **Test iddiası ölçülür.** `npm run sim` yeşil değilse faz bitmedi.
5. **Sıfır asset.** Ses ve görsel kodla üretilir.
6. **Yeni fikir → §5 Fikir Kutusu.** Faz ortasında kapsama eklenmez.

**Definition of Done (global):**
- `npm run build` temiz.
- `npm run sim` — tüm stratejiler sonlanır, denge hedefleri tutar.
- `npm run shots` — konsol hatası yok, 11 ekran görüntüsü.
- Tur baştan sona oynanıyor.
- 320 px mobilde HUD taşmıyor.

---

## 1. Faz Özeti

| Faz | Ad | Çıktı | Efor | Kapı |
|---|---|---|---|---|
| **S0** | His | Harita, seçim, tıkla-git-toplama, HUD | 1 oturum | "Tıklamak akıyor" |
| **S1** | Ekonomi | Köylü, taşıma, inşaat, çağlar, zafer | 1 oturum | Tur kazanılabiliyor |
| **S2** | Savaş | Akınlar, FSM, kule/kışla/milis, kayıp | 1 oturum | İlk akın tehdit |
| **S3** | Meta | Başlangıç/sonuç, Top 10, split, ses | 1 oturum | "Bir el daha" |
| **S4** | Cila | Denge, mobil, shots, README | 1 oturum | Hedef süreler |

---

## 2. Faz Detayları

### S0 — His

- [x] Vite + TS iskeleti, 480×270 canvas, DOM HUD
- [x] Sabit harita: Merkez, 2 orman, 2 altın, 2 taş yatağı
- [x] 3 köylü; seçim (tık + kutu), hover, hedef göstergesi
- [x] Yürüme + toplama + çantayla Merkez'e dönüş
- [x] Kaynak sayaçları, 3:00 sayacı, çağ göstergesi
- [x] Piksel çizimler, toz/kıvılcım, ilk sesler

### S1 — Ekonomi

- [x] Merkez'de köylü kuyruğu ve üretimi
- [x] Yeni köylünün son kaynağa otomatik gitmesi
- [x] Yatak tükenmesi + rotasyon
- [x] İnşaat yerleştirme, iskele, otomatik köylü atama
- [x] Çağ II, kule/kışla şartlı Çağ III
- [x] Zafer + süre kaydı
- [x] İlk denge simülasyonu

### S2 — Savaş

- [x] 4 akın dalgası + 3 sn uyarı + boynuz
- [x] Birim FSM: IDLE / MOVING / GATHERING / BUILDING / FIGHTING
- [x] Kule oto-ateş, milis aggro, barbar hedefleme
- [x] Kaçan köylü davranışı, ganimet
- [x] Merkez yıkımı ve kayıp ekranı
- [x] Savaş geri bildirimi: ok izi, kılıç kıvılcımı, sarsıntı

### S3 — Meta

- [x] Başlangıç ekranı, nasıl oynanır, hedef listesi
- [x] Duraklatma
- [x] Sonuç ekranı: süre, split, istatistik
- [x] Yerel Top 10 + isim + yeni rekor
- [x] Split hayaleti ve fark göstergesi
- [x] Tam ses seti + mute
- [x] Mobil dokunmatik HUD

### S4 — Cila

- [x] `sim.ts`: boşta / ekonomi / dengeli / uzman botları
- [x] Denge tablosu ve hedef süreler
- [x] `visual.mjs`: 11 ekran görüntüsü
- [x] README güncellemesi
- [x] 320 px mobil kontrol
- [ ] Son elle oynanış

---

## 3. Denge Hedefleri

| Oyuncu | Çağ II | İmparatorluk |
|---|---|---|
| İlk tur | ~0:25 | ~2:50 |
| Ortalama | ~0:18 | ~2:20 |
| Uzman | ~0:12 | ~1:45 |

Ölçülen başsız botlar (v1):

| Bot | Çağ II | İmparatorluk | Sonuç |
|---|---|---|---|
| Dengeli (7 köylü, 2 milis) | 0:11.2 | 2:07.5 | Zafer |
| Uzman (5 köylü, 1 milis) | 0:11.2 | 1:38.1 | Zafer |
| Sadece ekonomi | 0:24.3 | — | 2:14.5'te yenilgi |
| Boşta | — | — | 1:46.9'da yenilgi |

- Boşta oynayan 3:00'te kaybeder.
- Dengeli bot < 150 sn.
- Kule 0:45 akınını tek başına karşılayabilmeli; kulesiz Merkez hasar almalı.

---

## 4. Riskler

| Risk | Önlem |
|---|---|
| Mikro yükü 3 dakikada boğucu | Tek tık atama, otomatik yeni köylü, kaçan köylü |
| Ekran küçük, birimler okunmuyor | 480×270 + seçim halkası + hover etiketi |
| Akınlar ekonomi oyununu ezip geçiyor | 3 sn uyarı, otomatik kaçış, ganimet |
| Speedrun hilesi | Yerel tablo; hile iddiası yok, sabit harita |
| Denge tutmuyor | `sim.ts` + `config.ts` tek noktada |

---

## 5. Fikir Kutusu (v2+)

- Çevrimiçi liderlik tablosu ve günlük tohum
- İkinci harita: nehir geçidi / kule vadisi
- Fraksiyonlar: tüccar (altın), dağcı (taş)
- Bina yükseltmeleri: burç, ikinci ok
- Süvari akını ve mızrakçı
- Tekrar izleme / hayalet oynatma
- Günlük meydan okuma ve paylaşım kartı

---

## 6. Kayıt

```
imparatorluk.meta.v1 = {
  name, muted, plays,
  board: [{ name, time, age2, kills, date }],
  best: { time, age2 } | null,
  tutorialSeen
}
```
