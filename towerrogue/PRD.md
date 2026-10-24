# PRD — **Siper** (Roguelite Kule Savunma)

| Alan | Değer |
|---|---|
| Sürüm | 0.1 (tasarım taslağı) |
| Tarih | 2026-10-24 |
| Durum | Onay bekliyor |
| Kapsam | Tek kişilik, tarayıcı, solo geliştirme |
| İlgili dosya | `ROADMAP.md` |

---

## 1. Özet

**Tek cümle:** Sabit yollu, draft tabanlı bir kule savunma oyunu; her run 8-12 dakika sürer, ölüm her zaman okunabilir, meta hem dikey (grind) hem yatay (keşif) ilerler.

**Vizyon:** Oyuncu bir run'ı kaybettiğinde "hesabım zayıftı" değil "yanlış kule aldım" demeli. Bir sonraki run'a girerken kafasında somut bir plan olmalı. 40. run'da hâlâ denenmemiş bir build kalmalı.

**Neden bu oyun:** Kule savunma, "bir dalga daha" döngüsünü doğal olarak üretir. Roguelite meta ise bu döngüye uzun kuyruk ekler. İkisinin birleşimi kanıtlanmış bir formüldür; bu projedeki fark, meta'nın kayıp atfını bozmaması.

---

## 2. Hedefler ve Başarı Kriterleri

### Ürün hedefleri
1. Çekirdek döngü tek başına eğlenceli olsun (meta olmadan).
2. Kaybedilen her run'ın sebebi oyuncu tarafından tek cümleyle açıklanabilsin.
3. Meta ilerlemesi *seçenek* açsın, *zorunlu sayı* dayatmasın.
4. İçerik veri odaklı olsun; yeni kule eklemek kod değişikliği gerektirmesin.

### Ölçülebilir başarı kriterleri (MVP)

| Kriter | Hedef |
|---|---|
| Run süresi | 8-12 dk (dalga başına 20-35 sn) |
| Run başına anlamlı karar | ≥ 25 |
| İlk ölüm dalgası (yeni oyuncu) | 6-7 |
| İlk galibiyet | 5-8. run |
| Dikey ağacın tamamlanması | ~30-35 run |
| "4. el testi" | Test oyuncularının ≥ %60'ı ölümden sonra kendiliğinden 4. run'a başlar |
| "Plan testi" | Oyuncu öldükten sonra "bir dahaki sefere şunu yapacağım" diyebilir |

---

## 3. Tasarım Sütunları

1. **Kayıp okunabilir.** Deterministik hasar, görünür formül, run sonu raporu. Rastgele ölüm yok.
2. **Karar yoğunluğu > tur süresi.** Uzun run sorun değil; boş run sorun.
3. **Meta seçenek açar, sayı ezmez.** Dikey güç tavanlı ve respec'li; uzun kuyruk yatayda.
4. **Her run'da yeni bir şey.** Draft havuzu, modifier, Yükseliş kademesi.
5. **Sadelik görünür, derinlik altta.** Tek harita, tek yol, tek input tipi — derinlik sinerjiden gelir.

---

## 4. Hedef Kitle

- Kule savunma ve roguelite türlerini bilen, 10-20 dakikalık oturumlar oynayan oyuncu.
- Grind'den keyif alan, "ağacı doldurma" motivasyonu olan oyuncu.
- Hikâye/atmosfer beklentisi düşük; sistem ve optimizasyon odaklı oyuncu.

**Beklenti dışı:** Çok oyunculu, hikâye kampanyası, mobil mağaza sürümü, 3D.

---

## 5. Çekirdek Döngüler

```
MİKRO (5-20 sn)     : kule yerleştir / hedef önceliği değiştir / sat
RUN (8-12 dk)       : dalga → draft (3'ten 1) → yerleştir → dalga → ... → ölüm veya galibiyet
META (3-5 run)      : kıvılcım kazan → atölyede kademe veya unlock al
UZUN (20+ run)      : Yükseliş kademesi aç → daha zor, yeni modifier
```

### Run akışı (detay)

1. **Hazırlık:** Yük seçimi (3 slot, M5 sonrası), harita yüklenir, başlangıç altını verilir.
2. **Dalga öncesi:** Sıradaki dalganın kompozisyonu gösterilir. Draft açılır (ilk dalga hariç: ilk 2 kule başlangıçta verilir).
3. **Yerleştirme:** Boş yuvalara kule konur, satılır, hedef önceliği seçilir.
4. **Dalga:** 1x / 2x hızda oynar. Kaçan düşman kale canını götürür.
5. **Dalga sonu:** Altın ödülü, kısa özet.
6. **Tekrar.** Dalga 12'de boss. Boss ölürse run kazanılır.
7. **Ölüm:** Rapor ekranı → kıvılcım → atölye (opsiyonel) → yeni run.

---

## 6. Oynanış Spesifikasyonu

### 6.1 Harita ve yuvalar

- Tek harita, **tek sabit yol** (S veya çift viraj). Labirent kurma yok.
- **8 kule yuvası**, yolun iki yanında sabit konumlarda.
- Yuvalar arasında **komşuluk grafiği** tanımlı (sinerji için). Her yuva 2-3 komşuya bağlı.
- Yol uzunluğu ~28 tile. Düşmanlar sabit hızda ilerler, yavaşlatma çarpanı uygulanır.
- Sanat: geometrik/minimal (neon çizgiler, koyu zemin). Asset dosyası yok, her şey kodla çizilir (v1).

### 6.2 Kuleler (çekirdek 5)

| Kule | Rol | Hasar | Atış | Menzil | Maliyet | Özellik |
|---|---|---|---|---|---|---|
| **Okçu** | Tek hedef, hızlı | 10 | 1.2/sn | 3.0 | 50 | Uçan vurur |
| **Bombardıman** | Alan hasarı | 26 | 1/2.4 sn | 2.8 (min 1.0) | 90 | AoE 1.5 tile; zırhlıya %50 direnç |
| **Buz** | Kontrol | 4 | 1.0/sn | 2.5 | 70 | %35 yavaşlatma / 1.5 sn; uçan vurur |
| **Zehir** | Zırh kırıcı | 8/sn DOT (3 sn, 2 stack) | sürekli | 2.6 | 85 | Zırhı yok sayar; uçan vuramaz |
| **Tesla** | Çoklu hedef | 9 | 1.0/sn | 2.4 | 110 | 3 hedefe zincir (%20 azalan); uçan vurur |

- Her kulenin **2. seviyesi** var: maliyet = temel × 0.8, etki +%45.
- Satış: yatırımın %70'i geri döner.
- Hedef önceliği: `ilk` / `en güçlü` / `en yakın` (kule başına, varsayılan `ilk`).

### 6.3 Sinerjiler (komşuluk bazlı)

| Sinerji | Koşul | Etki |
|---|---|---|
| Ateş Hattı | Okçu ↔ Tesla komşu | İkisine +%10 saldırı hızı |
| Ağır Hasar | Bombardıman ↔ Zehir komşu | Zırhlı hedeflere +%15 hasar |
| Kırılganlık | Buz ↔ herhangi komşu | Yavaşlamış düşman o kuleden +%10 hasar alır |

Sinerji göstergesi UI'da görünür olmalı (bağlantı çizgisi + ikon). Oyuncu bunu keşfetmeli, ezberlemek zorunda kalmamalı → ilk kez kurulduğunda kısa bir "keşif" bildirimi.

### 6.4 Düşmanlar

| Düşman | HP | Hız | Direnç | Sızıntı | Ödül | Not |
|---|---|---|---|---|---|---|
| Yürüyen | 100 | 1.0 | — | 1 | 8 | Temel |
| Zırhlı | 260 | 0.7 | %50 fiziksel | 2 | 14 | Yavaş, tehdit |
| Uçan | 90 | 1.3 | — | 1 | 10 | Sadece anti-air kuleler vurur; yolu %15 kısaltır |
| Sürü | 45 | 1.4 | — | 1 | 5 | 6'lı gruplar |
| Şifacı | 150 | 0.9 | — | 1 | 12 | Çevresindeki 2 tile içinde 12 HP/sn iyileştirir |
| **Boss: Kuşatıcı** | 3200 | 0.5 | %30 fiziksel | 10 | 100 | Her 8 sn'de 3 Yürüyen çağırır |

**Anti-air tanımı:** Okçu, Buz, Tesla. Bombardıman ve Zehir uçan vuramaz. Bu, draft kararlarının ana gerilimi olmalı.

### 6.5 Dalga sistemi

- 12 dalga. Dalga 12 = boss.
- HP ölçekleme: `hp = base × 1.17^(dalga-1)`
- Sayı ölçekleme: `adet = baseADet + floor(dalga / 2)`
- **Dalga önizlemesi zorunlu:** ikon + adet + varsa uyarı ("zırhlı ağırlıklı", "hava tehdidi").
- Dalga kompozisyonları veri dosyasında elle tanımlı (prosedürel değil). Yükseliş kademeleri bunları çarpanla değiştirir.
- Dalga arası hazırlık süresi: duraklatılmış (süre baskısı yok).

### 6.6 Run içi ekonomi

- Başlangıç altını: **120**
- Öldürme ödülü: tabloda (6.4)
- Dalga tamamlama bonusu: `25 + 5 × dalga`
- Kule satışı: %70 iade
- Faiz / bileşik ekonomi **yok** (kapsam dışı).

### 6.7 Hasar modeli (deterministik)

```
hasar = max(1, floor(taban × (1 - direnç) × (1 + sinerjiBonusu)))
```

- Kritik vuruş, sapma, rastgelelik **yok**.
- Hasar tam sayı; kalan HP tam sayı.
- Simülasyon sabit adım: 60 Hz.
- Oyuncu, bir dalganın sonucunu önceden hesaplayabilmeli (en azından niteliksel olarak: "bu dalga zırhlı ağırlıklı, zehir şart").

### 6.8 Kale canı ve sızıntı

- Kale canı: **10**
- Sızıntı hasarı düşman tablosunda sabit.
- 0'a düşünce run biter.
- **1 can kaldığında** belirgin görsel/işitsel geri bildirim (bu, türün en güçlü gerilim anı).

### 6.9 Hız kontrolü

- `1x` / `2x` / `duraklat`
- Dalga içinde hız değiştirilebilir; yerleştirme sadece hazırlık fazında.
- Hedef: oyuncu asla "bekliyorum" demesin.

### 6.10 Juice (v1 zorunlu minimum)

- İsabet: 40 ms hit-stop (yalnızca boss/ölümcül vuruşlarda), 2-3 partikül
- Kule yerleştirme: kısa ölçek animasyonu + tık sesi
- Sızıntı: ekran kenarı kırmızı flaş + sarsıntı
- 1 can: sürekli hafif vinyet nabzı
- Ses: WebAudio ile sentez (dosya yok) — v1'de 5 ses yeterli

---

## 7. Meta Spesifikasyonu

### 7.1 Kıvılcım (para birimi)

```
kıvılcım = 8 + 3 × ulaşılanDalga        // ölümde
galibiyette +40 bonus
```

Ortalama: dalga 9'da ölüm → ~35 kıvılcım.

### 7.2 Atölye — dikey (grind)

4 dal, her dalda 5 kademe. Kademe başına **+%6** (o dalda).

| Dal | Etki |
|---|---|
| Hasar | Tüm kule hasarı |
| Menzil | Tüm kule menzili |
| Ekonomi | Başlangıç altını ve öldürme ödülü |
| Kale | Kale canı (10 → 13'e kadar) |

Maliyetler (her dal aynı): **20 / 35 / 55 / 80 / 110** → dal başına 300, toplam **1200**.

**Kurallar:**
- Toplam dikey güç tavanı: etkin olarak **+%25-30**. Oyun meta'sız da kazanılabilir olmalı.
- **Ücretsiz respec** (run dışında, tek tuş). "Yanlış dala yatırdım" hissi serbest, "hesabım zayıftı" hissi yasak.
- Kademe satın alma anında etkisi bir sonraki run'da başlar (run içinde güçlenme yok).

### 7.3 Atölye — yatay (keşif)

Kıvılcımla açılan içerik:

- 5 ek kule (toplam 10)
- 6 modifier (run başında rastgele 1 tanesi aktif olabilir)
- 10 "imza" eşyası (Yük slotları için)
- 2 ek harita (v1.1)
- 6 ek düşman tipi (v1.1)

Yatay unlock'lar **oynanışı değiştirmeli**, sadece sayı vermemeli.

### 7.4 Yük (loadout) — sentez mekaniği

> Atölyede açtığın imza eşyalarından her run başında **3 tanesini** seçip götürüyorsun.

- Slot sayısı: 3 (M5'te açılır; ilk run'da 1, Yükseliş 3'te 2 olur — opsiyonel).
- Örnek imzalar: "İlk kule ücretsiz", "Başlangıçta 1 ekstra draft hakkı", "İlk boss'a kadar +2 kale canı", "Zehir kulesi +1 stack".
- Amaç: dikey istatistikleri **karar** hâline getirmek. Böylece grind artsa da run başına karar yoğunluğu düşmez.

### 7.5 Yükseliş (prestij)

- Dikey ağaç tamamlandığında açılır. 10 kademe.
- Her kademe: düşman HP +%6
- Kademe 3+: düşman hızı +%4
- Kademe 5+: her dalgaya 1 elit düşman eklenir
- Her 2 kademede 1 yeni modifier havuza girer
- Ödül: kozmetik + modifier çeşitliliği. Sayısal güç **vermez**.

### 7.6 Çıplak mod

- Atölye ve Yük devre dışı, sadece çekirdek oyun.
- Ayrı istatistik ve ayrı "en iyi dalga" kaydı.
- İşlevi: (a) beceri kanıtı, (b) geliştiricinin denge test aracı.

### 7.7 Ölüm raporu (atıf mekanizması)

Run sonunda 4 satır:

1. **Nerede:** "Dalga 9'da düştün. 3 uçan birim kaleyi aştı."
2. **Neydi:** "Hava savunman yoktu (Okçu/Buz/Tesla yok)."
3. **Hangi tarafta:** `build hatası` / `güç eksiği` / `yerleşim hatası` / `ekonomi hatası` — tek etiket.
4. **Ne yapmalı:** "Bir sonraki run'da erken bir anti-air kulesi al."

Etiketleme kuralı:
- Dalga 6'dan önce ölüm → `yerleşim/ekonomi hatası` (meta suçlanmaz).
- Aynı dalgada 3+ kez ölüm + o dalgada "eksik tip" varsa → `build hatası`.
- Eksik tip yok ve DPS eşiğin %15 altındaysa → `güç eksiği` (meta önerilir).

---

## 8. UX ve Ekranlar

| Ekran | İçerik | Not |
|---|---|---|
| Ana menü | Oyna / Atölye / Yükseliş / İstatistikler / Ayarlar | Tek ekran, alt menü yok |
| Run | Yol, yuvalar, kuleler, kale canı, altın, dalga sayacı | HUD minimal |
| Dalga önizleme | Sıradaki dalga ikonları + uyarı | Draft ile aynı anda |
| Draft | 3 kart, 1 seçim | Kart: ikon, ad, 1 satır etki |
| Ölüm raporu | 4 satır + kazanılan kıvılcım + "Yeniden" | Tek tuşla restart |
| Atölye | 4 dal + yatay unlock ızgarası + respec | Kıvılcım göstergesi |
| Yükseliş | Kademe seçimi + kilit durumu | |
| İstatistikler | Run sayısı, en iyi dalga, galibiyet, build geçmişi | |

**Etkileşim:** Fare + klavye; dokunmatik v1.1 (canvas ölçekleme buna hazır olmalı).

**Erişilebilirlik (v1 minimum):** renk körü dostu ikonlar (tip ayrımı sadece renkle değil), 2x hız, duraklat.

---

## 9. Denge Hedefleri

| Metrik | Hedef |
|---|---|
| Dalga süresi | 20-35 sn |
| Run süresi | 8-12 dk |
| Run başına karar | ≥ 25 |
| Draft seçim dağılımı | Hiçbir kart %65'ten fazla seçilmemeli |
| Ultra kart oranı | Hiçbir kart %15'in altında seçilmemeli |
| İlk ölüm | Dalga 6-7 |
| İlk galibiyet | 5-8. run |
| Dikey ağaç bitişi | 30-35 run |
| Boss'un ölüm oranı (ilk karşılaşma) | %30-50 (kazanılabilir ama zor) |

Denge ayarı **headless simülasyon** ile yapılır, elle 12 dalga oynanarak değil.

---

## 10. Teknik Gereksinimler

### 10.1 Stack

- **Vite + TypeScript**
- **Canvas 2D**, oyun motoru yok
- Mantıksal çözünürlük 960×540, letterbox ölçekleme
- Sabit adım simülasyon (60 Hz) + render interpolasyonu
- Hedef: 60 FPS, 500+ düşman aynı anda

### 10.2 Mimari kurallar

1. **İçerik veri odaklı.** Kule/düşman/dalga/imza tanımları `src/content/*.ts` (veya JSON). Yeni kule = yeni kayıt, kod değil.
2. **Seed'li RNG.** Tüm rastgelelik `mulberry32(seed)` üzerinden. Seed arayüzde görünür, URL ile paylaşılabilir.
3. **Save versiyonlama.** `{ version, ... }` şeması; her migrasyon ayrı fonksiyon. Bozuk save → sıfırla, çökme yok.
4. **Dev panel (F1).** Dalga atla, altın ver, düşman çağır, hız değiştir, save sil.
5. **Headless sim.** `npm run sim -- --seed=42 --build=...` → dalga dalga sonuç dökümü.
6. **Deterministik.** Aynı seed + aynı girdi = aynı sonuç. Test edilebilirliğin temeli.

### 10.3 Performans

- Nesne havuzu (mermi, partikül).
- Kule hedefleme: kare bölme veya basit mesafe kontrolü (8 kule × 500 düşman = 4000 kontrol/Frame, yeterli).

### 10.4 Dosya yapısı (öneri)

```
src/
  main.ts              // boot, loop
  game/
    sim.ts             // sabit adım döngü
    state.ts           // run state
    towers.ts
    enemies.ts
    waves.ts
    damage.ts          // tek hasar fonksiyonu
    economy.ts
    draft.ts
    synergy.ts
  meta/
    save.ts
    workshop.ts
    ascension.ts
    report.ts
  render/
    canvas.ts
    hud.ts
    fx.ts
  content/
    towers.ts
    enemies.ts
    waves.ts
    signatures.ts
  ui/
    screens.ts
```

### 10.5 Teslim / dağıtım

- Statik build → GitHub Pages (veya itch.io).
- Tek `npm run build` ile çıkar. Backend yok.

---

## 11. Kapsam Dışı (v1)

- Labirent kurma / yol değiştirme
- Çok oyunculu, online skor tablosu, hesap sistemi
- Hikâye, kampanya, diyalog
- Kule içi upgrade ağacı (2. seviye yeterli)
- Prosedürel harita üretimi
- Mobil mağaza sürümü
- 3D, sprite animasyon borusu
- Run içi rastgele mutasyon kartları (Balatro tuzağı — denge maliyeti iki katına çıkar)

---

## 12. Riskler ve Önlemler

| Risk | Etki | Önlem |
|---|---|---|
| Meta'nın kayıp atfını bozması | Yüksek | Dikey tavan, respec, çıplak mod, ölüm raporu etiketlemesi |
| Denge cehennemi (içerik büyüdükçe) | Yüksek | Veri odaklı içerik + headless sim + dev panel |
| Projenin oynanabilirliği kaybetmesi (deadline yok) | Yüksek | Her faz sonunda oynanabilir build kuralı; meta en sona |
| Motivasyon düşüşü | Orta | Haftalık oynanabilir sürüm + her oturumda tek somut çıktı |
| Save şeması bozulması | Orta | Baştan versiyon + migrasyon + güvenli sıfırlama |
| Kapsam sürünmesi (yeni fikir) | Orta | Yeni fikirler `ROADMAP.md` "Fikir Kutusu"na; sprint ortasında eklenmez |
| Determinizm kaybı | Orta | Tüm rastgelelik tek RNG; `Math.random()` yasak |

---

## 13. Test ve Kabul Kriterleri

### Fonksiyonel kabul (MVP)
- [ ] 12 dalga baştan sona oynanabiliyor, boss ölünce galibiyet ekranı geliyor.
- [ ] Ölümde rapor doğru etiketi üretiyor (4 senaryoda elle doğrulanır).
- [ ] Save kapat-aç sonrası korunuyor; bozuk save çökme yaratmıyor.
- [ ] Aynı seed + aynı girdi aynı sonucu veriyor (3 tekrar).
- [ ] 1x/2x hız ve duraklat çalışıyor.
- [ ] Meta'sız (çıplak) oyun kazanılabilir.

### Kullanıcı testi (3-5 kişi, 20 dk)

1. **4. el testi:** Oyuncu öldükten sonra kendiliğinden yeni run başlatıyor mu? (≥ %60)
2. **Plan testi:** "Bir dahaki sefere ne yapacaksın?" sorusuna somut cevap veriyor mu?
3. **Atıf testi:** "Neden öldün?" → oyuncu kendi kararını mı gösteriyor, yoksa hesabı mı?
4. **Grind testi:** Atölye ekranında 5 saniyeden uzun süre kalıyor mu (ilgi) yoksa geçiyor mu?

Sonuçlar tek sayfalık not olarak saklanır; telemetri v1'de yok.

---

## 14. Açık Sorular

| # | Soru | Etki | Karar |
|---|---|---|---|
| 1 | Sanat yönü: geometrik neon mu, pixel mi? | Orta | Bekliyor |
| 2 | Oyun içi dil: TR mi, EN mi, ikisi mi? | Düşük | Bekliyor |
| 3 | Ses: tamamen sentez mi, birkaç örnek dosya mı? | Düşük | Sentez (v1) |
| 4 | Yükseliş kademelerinde meta sıfırlanmalı mı? | Yüksek | Bekliyor |
| 5 | v1'de tek harita yeterli mi? | Orta | Evet (v1.1'de 2. harita) |
| 6 | Dokunmatik destek v1'e girmeli mi? | Orta | Hayır (v1.1, ama ölçekleme hazır) |

---

## Ek A — Veri Şemaları

### Kule

```ts
type TowerDef = {
  id: string;
  name: string;
  cost: number;
  damage: number;
  fireRate: number;      // saniyedeki atış
  range: number;         // tile
  minRange?: number;
  targetMode: "first" | "strongest" | "closest";
  hitsAir: boolean;
  damageType: "physical" | "true" | "energy";
  effect?: { kind: "aoe" | "slow" | "dot" | "chain"; value: number; duration?: number; targets?: number };
  upgrade: { cost: number; multiplier: number };
};
```

### Düşman

```ts
type EnemyDef = {
  id: string;
  hp: number;
  speed: number;         // tile/sn
  resist: Partial<Record<"physical" | "energy", number>>;
  leak: number;
  reward: number;
  flying: boolean;
  onDeath?: { kind: "heal" | "summon"; value: number; radius?: number };
};
```

### Dalga

```ts
type WaveDef = {
  index: number;
  groups: { enemyId: string; count: number; delay: number; interval: number }[];
  warning?: string;      // "hava tehdidi"
};
```

### Save

```ts
type Save = {
  version: number;       // 1
  spark: number;
  workshop: Record<string, number>;   // branch -> tier (0-5)
  unlocked: string[];                 // kule / imza / modifier id
  ascension: number;                  // 0-10
  stats: { runs: number; bestWave: number; wins: number; nakedBestWave: number };
  settings: { speed: 1 | 2; lang: "tr" | "en" };
};
```

---

## Ek B — Terimler

- **Run:** Bir ölüm veya galibiyetle biten oyun oturumu.
- **Draft:** Dalga arasında 3 seçenekten 1 kule seçme.
- **Sızıntı:** Düşmanın yolu tamamlayıp kale canını götürmesi.
- **Yük:** Run başına seçilen 3 imza eşya.
- **Yükseliş:** Prestij zorluk kademesi.
- **Çıplak mod:** Meta'nın kapalı olduğu mod.
