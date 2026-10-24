import { launch } from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:4174/';
const OUT = 'test/shots';

mkdirSync(OUT, { recursive: true });

const browser = await launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
  defaultViewport: { width: 1180, height: 820 },
});

const errors = [];
const page = await browser.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await sleep(320);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('kaydedildi:', name);
};
const tick = (seconds) =>
  page.evaluate((s) => {
    const g = window.__game;
    const n = Math.round(s * 60);
    for (let i = 0; i < n && g.state.phase === 'playing'; i += 1) g.tick(1 / 60);
  }, seconds);

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('#overlay.open');
await shot('01-title');

await page.click('[data-act="start"]');
await sleep(350);
await page.evaluate(() => {
  const g = window.__game;
  const vs = g.villagers();
  g.state.selection = [vs[0].id, vs[1].id];
  g.assignSelected('wood');
  g.state.selection = [vs[2].id];
  g.assignSelected('gold');
});
await tick(9);
await shot('02-gather');

await page.evaluate(() => {
  const g = window.__game;
  g.debugAdd({ wood: 500, gold: 400, stone: 200 });
  g.debugPlace('tower', 196, 145);
  g.debugPlace('barracks', 292, 160);
});
await tick(11);
await page.evaluate(() => {
  const g = window.__game;
  g.debugAdd({ wood: 500, gold: 400, stone: 200 });
  g.researchAge();
});
await tick(7);
await page.evaluate(() => {
  const g = window.__game;
  g.debugAdd({ wood: 500, gold: 400, stone: 200 });
  g.trainMilitia();
  g.trainMilitia();
});
await tick(9);
await shot('03-base');

const ageState = await page.evaluate(() => ({
  pill: document.getElementById('age-pill')?.textContent,
  data: document.getElementById('age-pill')?.dataset.age,
  fill: document.getElementById('clock-fill')?.style.width,
}));
if (ageState.pill !== 'KRALLIK' || ageState.data !== '1') {
  errors.push(`age pill stale: ${JSON.stringify(ageState)}`);
}

await page.evaluate(() => {
  const g = window.__game;
  g.debugSetTime(42.6);
  g.state.waveIndex = 0;
});
await tick(0.6);
await shot('04-warning');

await page.evaluate(() => {
  const g = window.__game;
  g.state.waveIndex = 4;
  g.state.warning = null;
  g.debugWave('west', ['raider', 'raider', 'raider', 'warrior']);
  g.debugWave('south', ['raider', 'raider', 'warrior']);
});
await tick(6.5);
await shot('05-combat');

await page.keyboard.press('Space');
await sleep(350);
await shot('06-pause');
await page.keyboard.press('Space');
await sleep(250);

const phaseAfterPause = await page.evaluate(() => window.__game.state.phase);
if (phaseAfterPause !== 'playing') errors.push(`pause/resume failed: ${phaseAfterPause}`);

await page.evaluate(() => {
  const g = window.__game;
  g.debugAdd({ wood: 500, gold: 400, stone: 200 });
  if (g.state.age < 1) g.researchAge();
});
await tick(7);
await page.evaluate(() => {
  const g = window.__game;
  g.debugAdd({ wood: 500, gold: 400, stone: 200 });
  g.researchAge();
});
await tick(11);
await sleep(1600);
await shot('07-victory');

const victory = await page.evaluate(() => ({
  phase: window.__game.state.phase,
  win: window.__game.state.result?.win ?? false,
  overlay: document.getElementById('overlay')?.className,
  board: window.__meta.board.length,
}));
if (victory.phase !== 'victory' || !victory.win) errors.push('victory overlay missing');

await page.click('#overlay [data-act="board"]');
await sleep(300);
await shot('08-board');

const boards = await page.evaluate(() => document.querySelectorAll('#overlay tbody tr').length);
if (boards < 1) errors.push('leaderboard empty after victory');

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
if (overflow) errors.push('desktop horizontal overflow');

// Klavye, tıklayarak yerleştirme, ses ve yeniden başlatma.
await page.keyboard.press('Escape');
await sleep(250);
await page.keyboard.press('r');
await sleep(400);
const restarted = await page.evaluate(() => ({
  phase: window.__game.state.phase,
  time: window.__game.state.time,
  overlay: document.getElementById('overlay')?.className ?? '',
}));
if (restarted.phase !== 'playing' || restarted.time > 1 || restarted.overlay.includes('open')) {
  errors.push(`restart failed: ${JSON.stringify(restarted)}`);
}

const controls = await browser.newPage();
controls.on('console', (m) => {
  if (m.type() === 'error') errors.push(`controls console: ${m.text()}`);
});
controls.on('pageerror', (e) => errors.push(`controls pageerror: ${e.message}`));
await controls.goto(URL, { waitUntil: 'networkidle0' });
await controls.click('[data-act="start"]');
await sleep(350);
await controls.keyboard.press('v');
await controls.keyboard.press('a');
await controls.keyboard.press('q');
await sleep(120);
const keyState = await controls.evaluate(() => ({
  queue: window.__game.activeBuilding('tc')?.queue ?? -1,
  selected: window.__game.state.selection.length,
  lastAssign: window.__game.state.lastAssign,
}));
if (keyState.queue < 1 || keyState.selected < 3 || keyState.lastAssign !== 'wood') {
  errors.push(`keyboard controls failed: ${JSON.stringify(keyState)}`);
}
await controls.evaluate(() => window.__game.debugAdd({ wood: 300, gold: 200, stone: 100 }));
await controls.keyboard.press('t');
const box = await controls.evaluate(() => {
  const r = document.getElementById('scene').getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await controls.mouse.click(box.x + (196 / 480) * box.w, box.y + (145 / 270) * box.h);
await sleep(200);
const placed = await controls.evaluate(() => ({
  tower: window.__game.state.buildings.some((b) => b.kind === 'tower'),
  placement: window.__game.state.placement,
}));
if (!placed.tower || placed.placement !== null) errors.push(`click placement failed: ${JSON.stringify(placed)}`);
await controls.keyboard.press('f');
await sleep(150);
const researching = await controls.evaluate(() => window.__game.state.research?.target ?? null);
if (researching !== 1) errors.push(`age hotkey failed: ${researching}`);
await controls.keyboard.press('Space');
await sleep(250);
const paused = await controls.evaluate(() => window.__game.state.phase);
await controls.keyboard.press('Space');
await sleep(250);
const resumed = await controls.evaluate(() => window.__game.state.phase);
if (paused !== 'paused' || resumed !== 'playing') errors.push(`space pause failed: ${paused}/${resumed}`);
await controls.click('#mute-btn');
await sleep(100);
const muted = await controls.evaluate(() => window.__meta.muted);
if (muted !== true) errors.push('mute did not persist');
await controls.click('#mute-btn');
await sleep(100);

const loss = await browser.newPage();
loss.on('console', (m) => {
  if (m.type() === 'error') errors.push(`loss console: ${m.text()}`);
});
loss.on('pageerror', (e) => errors.push(`loss pageerror: ${e.message}`));
await loss.goto(URL, { waitUntil: 'networkidle0' });
await loss.click('[data-act="start"]');
await sleep(300);
await loss.evaluate(() => window.__game.debugLose());
await sleep(1200);
await loss.screenshot({ path: `${OUT}/09-defeat.png` });
console.log('kaydedildi: 09-defeat');
const defeat = await loss.evaluate(() => ({
  phase: window.__game.state.phase,
  reason: window.__game.state.result?.reason,
  overlay: document.getElementById('overlay')?.className,
  text: document.getElementById('overlay')?.textContent ?? '',
}));
if (defeat.phase !== 'defeat' || defeat.reason !== 'tc' || !defeat.text.includes('MERKEZ')) {
  errors.push(`defeat screen failed: ${JSON.stringify({ phase: defeat.phase, reason: defeat.reason })}`);
}

// Mobile layout and touch-sized controls.
const mobile = await browser.newPage();
mobile.on('console', (m) => {
  if (m.type() === 'error') errors.push(`mobile console: ${m.text()}`);
});
mobile.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await mobile.goto(URL, { waitUntil: 'networkidle0' });
await mobile.waitForSelector('#overlay.open');
await sleep(350);
await mobile.screenshot({ path: `${OUT}/10-mobile-title.png` });
console.log('kaydedildi: 10-mobile-title');
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
if (mobileOverflow) errors.push('mobile horizontal overflow');
await mobile.click('[data-act="start"]');
await sleep(700);
await mobile.screenshot({ path: `${OUT}/11-mobile-game.png` });
console.log('kaydedildi: 11-mobile-game');
await mobile.tap('[data-act="villager"]');
await sleep(150);
const mobileQueue = await mobile.evaluate(() => window.__game.activeBuilding('tc')?.queue ?? -1);
if (mobileQueue < 1) errors.push(`mobile command failed: queue ${mobileQueue}`);
const mobileBox = await mobile.evaluate(() => {
  const r = document.getElementById('scene').getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await mobile.touchscreen.tap(
  mobileBox.x + (224 / 480) * mobileBox.w,
  mobileBox.y + (202 / 270) * mobileBox.h,
);
await sleep(150);
const mobileSelection = await mobile.evaluate(() => window.__game.state.selection.length);
if (mobileSelection < 1) errors.push('mobile canvas selection failed');

const narrow = await browser.newPage();
narrow.on('console', (m) => {
  if (m.type() === 'error') errors.push(`320px console: ${m.text()}`);
});
narrow.on('pageerror', (e) => errors.push(`320px pageerror: ${e.message}`));
await narrow.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true });
await narrow.goto(URL, { waitUntil: 'networkidle0' });
await narrow.waitForSelector('#overlay.open');
await sleep(300);
const narrowCheck = await narrow.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  startButton: document.querySelector('#overlay [data-act="start"]')?.getBoundingClientRect().width ?? 0,
}));
if (narrowCheck.overflow || narrowCheck.startButton < 80) {
  errors.push(`320px layout failed: ${JSON.stringify(narrowCheck)}`);
}

await browser.close();

if (errors.length) {
  console.error('\nHATALAR:');
  for (const error of errors) console.error(' -', error);
  process.exitCode = 1;
} else {
  console.log('\nGörsel test tamam: konsol hatası yok, düzen taşmıyor.');
}
