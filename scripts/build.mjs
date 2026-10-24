import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const portalDir = path.join(rootDir, 'portal');

console.log('--- [Weekend Arcade] Build Süreci Başlatılıyor ---');

// 1. dist klasörünü sıfırla
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 2. Portal statik dosyalarını dist köküne kopyala
const portalFiles = ['index.html', 'portal.css', 'portal.js', 'favicon.svg', 'games.json'];
for (const file of portalFiles) {
  const src = path.join(portalDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}
console.log('✓ Portal ana arayüzü dist köküne yerleştirildi.');

// 3. games.json dosyasını oku ve oynanabilir oyunları derle
const gamesConfigPath = path.join(portalDir, 'games.json');
let games = [];
try {
  games = JSON.parse(fs.readFileSync(gamesConfigPath, 'utf8'));
} catch (err) {
  console.error('Hata: games.json okunamadı:', err);
  process.exit(1);
}

const backButtonHtml = `
  <!-- Portal Navigation Back Pill -->
  <style>
    .portal-nav-pill {
      position: fixed;
      top: 12px;
      right: 14px;
      z-index: 99999;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(14, 16, 22, 0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      color: #e5e7eb;
      text-decoration: none;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      pointer-events: auto;
    }
    .portal-nav-pill:hover {
      background: rgba(28, 32, 44, 0.95);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.35);
      transform: translateY(-1px);
    }
    .portal-nav-pill svg {
      width: 13px;
      height: 13px;
    }
  </style>
  <a href="../" class="portal-nav-pill" title="Weekend Arcade Ana Sayfasına Dön">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
    <span>Portal</span>
  </a>
`;

for (const game of games) {
  if (game.status === 'playable' && game.buildDir) {
    const gameDir = path.join(rootDir, game.buildDir);
    console.log(`\n▶ [${game.title}] derleniyor (${game.buildDir})...`);

    if (!fs.existsSync(gameDir)) {
      console.warn(`Uyarı: ${game.buildDir} klasörü bulunamadı, atlanıyor.`);
      continue;
    }

    // node_modules yoksa (CI / Vercel sıfır kurulum ortamı) npm install çalıştır
    const nodeModulesPath = path.join(gameDir, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log(`  └─ Bağımlılıklar eksik, npm install çalıştırılıyor...`);
      execSync('npm install --no-audit --no-fund', { cwd: gameDir, stdio: 'inherit' });
    }

    // Oyunu derle
    console.log(`  └─ Build çalıştırılıyor (npm run build)...`);
    execSync('npm run build', { cwd: gameDir, stdio: 'inherit' });

    const gameDist = path.join(gameDir, 'dist');
    const targetDir = path.join(distDir, game.id);

    if (fs.existsSync(gameDist)) {
      fs.cpSync(gameDist, targetDir, { recursive: true });

      // index.html içine geri dönüş butonunu ekle
      const targetIndex = path.join(targetDir, 'index.html');
      if (fs.existsSync(targetIndex)) {
        let content = fs.readFileSync(targetIndex, 'utf8');
        if (!content.includes('portal-nav-pill')) {
          content = content.replace('</body>', `${backButtonHtml}\n</body>`);
          fs.writeFileSync(targetIndex, content, 'utf8');
        }
      }
      console.log(`✓ [${game.title}] başarıyla 'dist/${game.id}' klasörüne yerleştirildi.`);
    } else {
      console.error(`Hata: ${game.title} için dist klasörü oluşmadı!`);
      process.exit(1);
    }
  }
}

console.log('\n===========================================');
console.log('✓ Weekend Arcade paketi Vercel için hazır!');
console.log(`✓ Dağıtım klasörü: ${distDir}`);
console.log('===========================================\n');
