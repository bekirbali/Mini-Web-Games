# Weekend Arcade

Tarayıcıda sıfır kurulumla çalışan, hızlı başlayan ve derinleşen bağımsız mikro oyun koleksiyonu. Vercel üzerinden anında yayınlanabilir biçimde kurgulanmıştır.

| Oyun | Klasör / Yol | Durum | Tek Cümle |
|---|---|---|---|
| **Lanetli Demirci** | [`demirci/`](./demirci) | Oynanabilir v1 | Her vuruşta zamanlama + risk seçimi: müşterinin eşyasını +9'a basma oyunu |
| **3 Dakikalık İmparatorluk** | [`imparatorluk/`](./imparatorluk) | Oynanabilir v1 | Tek ekran mikro-RTS: 180 saniyede İmparatorluk Çağı'na ulaş, akınlara dayan |
| **Siper (Tower Roguelite)** | [`towerrogue/`](./towerrogue) | Tasarım (PRD) | Draft tabanlı, dikey + yatay meta ilerlemeli kule savunma oyunu |

---

## Kurulum ve Komutlar

### 1. Tüm Portalı ve Oyunları Derleme

```bash
npm run build
```

Bu komut:
1. `portal/` ana sayfasını `dist/` köküne yerleştirir.
2. `portal/games.json` içinde tanımlı tüm oynanabilir oyunları sırayla derler (`demirci`, `imparatorluk`).
3. Oyunların içine portal geri dönüş butonunu ekler ve derleme çıktılarını `dist/<oyun-id>/` içine yerleştirir.

### 2. Yerel Önizleme (Build Sonrası Test)

```bash
npm run preview
```

Tarayıcınızda `http://localhost:3000` adresini açarak tüm portalı ve oyunları test edebilirsiniz.

### 3. Tekil Oyun Geliştirme (Hot-Reload)

```bash
# Lanetli Demirci için:
npm run dev:demirci

# 3 Dakikalık İmparatorluk için:
npm run dev:imparatorluk
```

---

## Vercel Üzerinde Yayınlama

Bu klasörü doğrudan GitHub'a bir repository olarak yüklediğinizde, kökteki [`vercel.json`](./vercel.json) sayesinde ek bir ayar yapmanıza gerek kalmaz:

- **Build Command:** `node scripts/build.mjs`
- **Output Directory:** `dist`
- **Trailing Slash:** `true`

---

## Yeni Bir Oyun Ekleme (Modüler Yapı)

Koleksiyona yeni bir mikro oyun eklemek 3 basit adımdan ibarettir:

1. **Yeni Oyun Klasörü Açın:**
   Kök dizine yeni oyununuzun klasörünü oluşturun (örneğin `labirent/`). İçine kendi `package.json`, `index.html`, `vite.config.ts` ve kodlarınızı koyun.
2. **`portal/games.json` Dosyasına Ekleyin:**
   Yeni oyunun meta verilerini ve klasörünü JSON'a ekleyin:
   ```json
   {
     "id": "labirent",
     "title": "Karanlık Labirent",
     "tagline": "Görünmez Tuzaklar",
     "description": "Her adımda ses dalgalarıyla yolu keşfet...",
     "genre": "Bulmaca / Roguelite",
     "duration": "4 dk",
     "status": "playable",
     "badge": "Oynanabilir v1",
     "tags": ["Ses Tasarımı", "Gizem"],
     "path": "./labirent/",
     "accentColor": "#a855f7",
     "icon": "sparkle",
     "buildDir": "labirent"
   }
   ```
3. **Build Alın:**
   `npm run build` komutunu çalıştırın. Script yeni oyunu otomatik olarak tespit edip derleyecek, portala bağlayacak ve `dist/labirent` olarak yayına hazır hale getirecektir.
