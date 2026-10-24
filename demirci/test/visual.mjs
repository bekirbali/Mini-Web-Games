import { launch } from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4173/';
const OUT = 'test/shots';

mkdirSync(OUT, { recursive: true });

const browser = await launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1180, height: 820 },
});

const page = await browser.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('.card');

const shot = async (name) => {
  await new Promise((r) => setTimeout(r, 320));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('kaydedildi:', name);
};

await shot('01-title');

await page.click('[data-act="start"]');
await page.waitForSelector('.card');
await shot('02-day');

await page.click('[data-act="open"]');
await page.waitForSelector('.customer-card');
await shot('03-arrive');

await page.click('[data-act="accept"]');
await page.waitForSelector('.bar-shell');
await shot('04-stance');

await page.click('.stance.normal');
await page.waitForSelector('.bar-shell.live');
await shot('05-strike');

// merkeze denk gelen anda vur
await page.evaluate(() => {
  const g = window.__game;
  const s = g.state;
  if (s.phase === 'strike') {
    const at = s.barStart + (0.25 / s.barSpeed) * 1000;
    g.strike(Math.max(performance.now(), at));
  }
});
await new Promise((r) => setTimeout(r, 260));
await shot('06-result');

// hızlı ilerlet: gün sonu dükkânına kadar
const fastTo = async (target) => {
  await page.evaluate(async (targetPhase) => {
    const g = window.__game;
    for (let i = 0; i < 6000; i += 1) {
      const s = g.state;
      if (s.phase === targetPhase) return;
      switch (s.phase) {
        case 'dayIntro':
          g.openShop();
          break;
        case 'arrive':
          g.accept();
          break;
        case 'stance':
          g.chooseStance('normal');
          break;
        case 'strike':
          g.strike(s.barStart + 0.25 / s.barSpeed * 1000);
          break;
        case 'result':
          g.tick(Number.MAX_SAFE_INTEGER);
          break;
        case 'rescue':
          g.resolveRescue('scroll');
          break;
        case 'ownForgeIntro':
          g.startOwnForge();
          break;
        case 'shop': {
          const cost = g.shopCost();
          const card = s.shopOptions[0];
          if (card && s.gold >= cost) g.pickUpgrade(card.id);
          else g.skipShop();
          break;
        }
        default:
          break;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  }, target);
  await page.waitForSelector('.card');
};

await fastTo('shop');
await shot('07-shop');

await page.click('[data-upgrade]');
await page.waitForSelector('.card');
await fastTo('auction');
await shot('08-auction');

const state = await page.evaluate(() => {
  const s = window.__game.state;
  return { phase: s.phase, day: s.day, gold: Math.round(s.gold), score: s.score };
});
console.log('durum:', state);

await browser.close();

if (errors.length > 0) {
  console.log('\nHATALAR:');
  for (const e of errors) console.log(' -', e);
  process.exitCode = 1;
} else {
  console.log('\nKonsol hatası yok.');
}
