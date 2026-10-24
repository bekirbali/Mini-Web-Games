# ROADMAP — **Siper**

| Alan | Değer |
|---|---|
| Sürüm | 0.1 |
| Tarih | 2026-10-24 |
| İlgili dosya | `PRD.md` |
| Süre | Deadline yok — sıralama ve çıktı odaklı |

---

## 0. Çalışma Kuralları

Bu projede deadline yok, dolayısıyla disiplin "hız" değil **"sıra"** üzerinden kurulur.

1. **Meta en sona.** Çekirdek eğlenceli değilse meta onu kurtarmaz.
2. **Her faz sonunda oynanabilir build.** Derlenen ama oynanmayan bir hafta yok.
3. **Tek oturumda tek somut çıktı.** Oturum sonunda not: ne bitti, ne bozuldu, sıradaki adım.
4. **Yeni fikir → "Fikir Kutusu".** Faz ortasında kapsama eklenmez.
5. **`Math.random()` yasak.** Tüm rastgelelik seed'li RNG'den.
6. **İçerik veri dosyasında.** Yeni kule = yeni kayıt.
7. **Denge ölçümle, hisle değil.** Karar gerekiyorsa headless sim çalıştır.

**Oturum tanımı:** 3-4 saatlik odaklı çalışma bloğu. Aşağıdaki eforlar bu birimle verilmiştir.

**Global Definition of Done (her fazda):**
- `npm run dev` sorunsuz açılıyor, konsolda hata yok.
- Build alınabiliyor.
- Fazın "çıkış kriteri" maddelerinin tamamı elle doğrulandı.
- Save bozulmuyor (F4'ten itibaren).

---

## 1. Faz Özeti

| Faz | Ad | Çıktı | Efor | Bağımlılık |
|---|---|---|---|---|
| **F0** | Oyuncak | 1 kule, 1 düşman, 3 dalga | 2 oturum | — |
| **F1** | Dikey dilim | 3 kule, 3 düşman, 5 dalga, ölüm/restart | 4 oturum | F0 |
| **F2** | Çekirdek | Draft, önizleme, 12 dalga, boss, hız | 5 oturum | F1 |
| **F3** | Okunabilirlik | Deterministik hasar, rapor, ekonomi | 3 oturum | F2 |
| **F4** | Meta dikey | Kıvılcım, atölye, save, respec | 4 oturum | F3 |
| **F5** | Meta yatay | Unlock havuzu, Yük/loadout | 5 oturum | F4 |
| **F6** | Prestij | Yükseliş, çıplak mod | 4 oturum | F5 |
| **F7** | İçerik + cila | 10 kule, 15 düşman, modifier, ses | 10 oturum | F6 |
| **F8** | Yayın | Build, sayfa, test turu | 2 oturum | F7 |

**Toplam:** ~39 oturum (≈130-155 saat). Acelesi yok; haftada 2-3 oturum = ~4 ay.

> Karar noktası: **F1 sonu.** Çekirdek eğlenceli değilse F2'ye geçme — burada mekaniği değiştirmek ucuz, F4'ten sonra pahalı.

---

## 2. Faz Detayları

### F0 — Oyuncak (2 oturum)

**Amaç:** "Hissi var mı?" sorusuna cevap. Görsellik ve denge yok.

**Yapılacaklar**
- [ ] Vite + TS iskeleti, canvas, sabit adım döngü
- [ ] Tek yol (düz çizgi yeterli), 4 yuva
- [ ] Tek kule: Okçu (tek hedef, mermi)
- [ ] Tek düşman: Yürüyen (yol boyunca yürür, ölür)
- [ ] 3 dalga, dalga sonu otomatik ilerleme
- [ ] Kale canı + sızıntı + ölüm ekranı (düz metin)

**Çıkış kriteri**
- 3 dalga baştan sona oynanıyor.
- Düşman ölünce altın geliyor, kule konabiliyor.
- FPS 60, konsol temiz.

**Bilinçli olarak yok:** draft, menü, ses, save, ikinci kule.

---

### F1 — Dikey Dilim (4 oturum) ⭐ KARAR NOKTASI

**Amaç:** Çekirdeğin eğlenceli olup olmadığını ölçmek.

**Yapılacaklar**
- [ ] 3 kule: Okçu, Bombardıman (AoE), Buz (slow)
- [ ] 3 düşman: Yürüyen, Zırhlı, Uçan
- [ ] 5 dalga, elle yazılmış kompozisyon
- [ ] Altın ekonomisi (başlangıç + öldürme + dalga bonusu)
- [ ] Kule satma, 2. seviye
- [ ] Dalga içi 1x/2x hız
- [ ] Basit HUD (can, altın, dalga)

**Çıkış kriteri**
- 5 dalga oynanıyor; uçan gelince "anti-air lazım" hissi oluşuyor.
- Oyuncu bir dalgayı kaybedince neden kaybettiğini söyleyebiliyor.
- En az 1 kişiye oynatıldı; not alındı.

**Karar:** Eğlenceli değilse burada 1-2 oturum mekanik denemesi yap (farklı kule seti, farklı hız). Hâlâ yoksa proje yönü değişir — F2'ye geçilmez.

---

### F2 — Çekirdek Döngü (5 oturum)

**Amaç:** Tam run deneyimi (meta'sız).

**Yapılacaklar**
- [ ] Draft sistemi: dalga arası 3 kart, 1 seçim
- [ ] Dalga önizleme + uyarı etiketleri ("hava tehdidi", "zırhlı ağırlıklı")
- [ ] 5 kule (Zehir, Tesla eklenir), 5 düşman (Sürü, Şifacı eklenir)
- [ ] 12 dalga + boss (Kuşatıcı)
- [ ] Sinerji sistemi + görsel bağlantı göstergesi
- [ ] Hedef önceliği seçimi
- [ ] Galibiyet ekranı
- [ ] Yol ve yuvaların gerçek harita düzeni (komşuluk grafiği)

**Çıkış kriteri**
- Tam bir run 8-12 dakikada bitiyor.
- Draft kartları arasında gerçek bir tercih var (biri diğerinden belirgin üstün değil).
- Boss ilk karşılaşmada zor ama kazanılabilir.
- Aynı seed aynı run'ı üretiyor.

---

### F3 — Okunabilirlik (3 oturum)

**Amaç:** "Neden öldüm?" sorusunun cevabını sistem versin.

**Yapılacaklar**
- [ ] Tek hasar fonksiyonu (`damage.ts`), tüm çağrılar oradan
- [ ] Hasar formülü UI'da erişilebilir (kule detay paneli)
- [ ] Run istatistiği toplama: dalga bazında sızıntı, hasar tipi dağılımı, DPS eşiği
- [ ] Ölüm raporu ekranı (4 satır + etiket)
- [ ] Etiketleme kuralları (PRD §7.7)
- [ ] 1 can kaldığında görsel/işitsel uyarı
- [ ] Dev panel (F1): dalga atla, altın ver, hız, save sil

**Çıkış kriteri**
- 4 farklı ölüm senaryosunda rapor doğru etiket üretiyor.
- Rapor olmadan da oyuncu neden öldüğünü anlıyor (rapor doğrulayıcı, açıklayıcı değil).

---

### F4 — Meta Dikey (4 oturum)

**Amaç:** Grind katmanı. Buradan sonra save ciddiye biner.

**Yapılacaklar**
- [ ] Save şeması + versiyon + migrasyon iskeleti
- [ ] Kıvılcım kazanımı ve gösterimi
- [ ] Atölye ekranı: 4 dal × 5 kademe
- [ ] Kademe maliyetleri ve etkileri (PRD §7.2)
- [ ] Ücretsiz respec
- [ ] Ana menü (Oyna / Atölye / İstatistikler / Ayarlar)
- [ ] İstatistik ekranı (run sayısı, en iyi dalga, galibiyet)

**Çıkış kriteri**
- Save kapat-aç sonrası korunuyor; bozuk save çökmüyor.
- Respec sonrası run doğru değerlerle başlıyor.
- Dikey ağaç tavanı aşılamıyor.

**Dikkat:** Dikey güç *run başında* uygulanır, run içinde asla.

---

### F5 — Meta Yatay (5 oturum)

**Amaç:** Uzun kuyruk ve build çeşitliliği.

**Yapılacaklar**
- [ ] Unlock havuzu altyapısı (kule / imza / modifier ayrımıyla)
- [ ] 5 ek kule (toplam 10)
- [ ] 10 imza eşyası
- [ ] Yük ekranı: 3 slot, run başına seçim
- [ ] İmza etkilerinin run başlangıcına uygulanması
- [ ] 6 modifier (run başında rastgele 1'i aktif)
- [ ] Unlock satın alma UI'ı + "sonraki açılım" göstergesi

**Çıkış kriteri**
- 3 farklı Yük kombinasyonu belirgin şekilde farklı oynanıyor.
- Hiçbir unlock "zorunlu" değil; çıplak oyun hâlâ kazanılabilir.
- Yeni kule eklemek sadece veri dosyası değişikliğiyle mümkün (doğrulanır).

---

### F6 — Prestij (4 oturum)

**Amaç:** Grind sevenler için uzun kuyruk.

**Yapılacaklar**
- [ ] Yükseliş kademeleri 1-10 (PRD §7.5)
- [ ] Kademe seçim ekranı
- [ ] Kademeye bağlı düşman HP/hız/elit uygulaması
- [ ] Kademe başına modifier havuzu genişlemesi
- [ ] Çıplak mod (meta kapalı) + ayrı istatistik
- [ ] Build geçmişi kaydı (son 20 run: kuleler, yük, ölüm dalgası)

**Çıkış kriteri**
- Yükseliş 3, Yükseliş 0'dan ölçülebilir şekilde zor.
- Çıplak modda kazanmak mümkün (denge testi bunu doğrular).
- Kademe değişimi save'i bozmuyor.

---

### F7 — İçerik ve Cila (10 oturum)

**Amaç:** Oyunu "bitmiş" hissettirmek.

**İçerik**
- [ ] 5 kule (toplam 10): örn. Alev (yakın alan), Keskin Nişancı (tek hedef, uzun menzil), Manyetik (yavaşlat + çekme), Kutsal (buff), Havan (uçan vuramaz, çok yüksek AoE)
- [ ] 10 düşman (toplam 15): kalkanlı, bölünen, görünmez, hızlanan, patlayan, mini-boss
- [ ] 2 ek harita (farklı yuva düzeni)
- [ ] 6 modifier (toplam 12): "kuleler %20 ucuz, düşmanlar %10 hızlı" gibi net takaslar
- [ ] 3 boss varyantı

**Cila**
- [ ] Juice listesi (PRD §6.10) tamamı
- [ ] Ses: WebAudio sentez, 8-10 efekt
- [ ] Ana menü görsel kimliği
- [ ] Ayarlar: ses, hız, dil
- [ ] Renk körü dostu ikon seti

**Denge**
- [ ] Headless sim ile 20+ build testi
- [ ] Draft seçim dağılımı ölçümü (hiçbir kart %65 üstü olmamalı)
- [ ] Dikey ağaç bitiş süresi 30-35 run'a ayarla

**Çıkış kriteri**
- 3 farklı haritada 3 farklı build ile galibiyet alınabiliyor.
- 10 kule de en az bir build'de kullanılıyor.
- Oyun 60 FPS'te kalıyor (500 düşman testi).

---

### F8 — Yayın (2 oturum)

- [ ] Production build + GitHub Pages / itch.io
- [ ] README: nasıl oynanır, seed paylaşımı
- [ ] 3-5 kişilik test turu (PRD §13)
- [ ] Test notlarını F7'ye geri besle (1 denge turu)
- [ ] Kısa GIF/video

**Çıkış kriteri**
- Link üzerinden tarayıcıda oynanıyor.
- 4. el testini ≥ %60 geçiyor.
- Bilinen kritik hata yok.

---

## 3. Sıralama Gerekçesi

| Karar | Neden |
|---|---|
| Meta F4'te | Çekirdek eğlenceli değilse meta kurtarmaz; erken meta, yanlış şeyi cilalar |
| Save F4'te | Save'den önce meta yok; meta'dan önce save gereksiz |
| Rapor F3'te | Meta'dan önce kayıp atfı çözülmeli, yoksa meta yanlış suçlanır |
| Loadout F5'te | Dikey istatistikler ancak seçenek hâline gelirse karar üretir |
| Prestij F6'da | Yatay havuz olmadan prestij boş görünür |
| İçerik F7'de | Sistem oturmadan içerik üretmek, iki kez üretmek demek |
| Headless sim F7'de zorunlu | 10 kule × 15 düşman elle dengelenemez |

---

## 4. Fikir Kutusu (ertelenenler)

Buradakiler kapsam dışı ama kaybolmasın:

- Günlük seed modu + paylaşılabilir skor
- Kule hedefleme için "alan önceliği" (en kalabalık noktaya vur)
- Run içi "acil durum" yeteneği (tek kullanımlık, 3 dk bekleme)
- Kule birleştirme (aynı tip 2 kule → 1 güçlü)
- Harita üzerinde çevresel engel (kaya, nehir)
- Kozmetik kule görünümleri
- Mobil dokunmatik + PWA
- Fotoğraf modu / run tekrar oynatma (deterministik olduğu için ucuz)
- Steam/itch.io sayfası için trailer

**Kural:** Buradan bir madde alınacaksa faz sonunda alınır, faz ortasında değil.

---

## 5. Risk Takibi

| Risk | Erken uyarı sinyali | Müdahale |
|---|---|---|
| Çekirdek sıkıcı | F1'de test oyuncusu 5 dalgayı bitirmek istemiyor | F2'yi durdur, mekaniği değiştir |
| Denge çöküyor | Draft'ta hep aynı kart seçiliyor | Kart maliyet/etki tablosunu sim ile tara |
| Meta suçlanıyor | Test oyuncusu "param yok" diyor | Dikey tavanı düşür, çıplak modu öne çıkar |
| Kapsam sürünmesi | Faz ortasında yeni kule fikri | Fikir Kutusu'na yaz, devam et |
| Motivasyon | 2 hafta oynanabilir build çıkmadı | Kapsamı bir sonraki teslimata indir, yine de build çıkar |
| Teknik borç | `damage.ts` dışında hasar hesabı | Derhal merkezileştir, testle kilitle |

---

## 6. Ölçüm Defteri

Her faz sonunda doldurulacak kısa kayıt (proje kökünde `notes/` altında tutulabilir):

```
Faz:
Tarih:
Ne bitti:
Ne bozuldu:
Ölçülen metrikler: (run süresi / ölüm dalgası / draft dağılımı)
Sıradaki adım:
Fikir Kutusu'na eklenen:
```

---

## 7. İlk Oturum Planı (F0-1)

Somut ilk adım, karar gerektirmeyen kısım:

1. `npm create vite@latest siper -- --template vanilla-ts`
2. `src/main.ts`: canvas, 960×540, letterbox ölçekleme
3. Sabit adım döngü: `accumulator` + 60 Hz `step()` + `render(alpha)`
4. `src/game/sim.ts`: state `{ time, enemies[], towers[], gold, castleHp, wave }`
5. Düz yol çiz (tek çizgi), 4 yuva işaretle
6. Bir düşman spawn et, sabit hızda yürüsün, yol sonunda kaybolsun
7. Kule koy: tıkla → mermi → düşman ölsün

Bu 7 adım bittiğinde "oyuncak" var. Sonrası F0-2: dalga döngüsü + kale canı + ölüm ekranı.

---

## 8. Açık Kararlar (F0'dan önce netleşmeli)

| # | Karar | Öneri |
|---|---|---|
| 1 | Sanat yönü | Geometrik neon (asset yok, hızlı, tutarlı) |
| 2 | Dil | Önce TR, metinler tek dosyada → sonra EN |
| 3 | Yol şekli | Çift virajlı S (28 tile) |
| 4 | Yuva sayısı | 8 (komşuluk grafiği ile) |
| 5 | Ses | Sentez (dosya yok) |
