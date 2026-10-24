import './styles.css';
import { Game } from './game';
import { Renderer } from './render';
import { Input } from './input';
import { UI, type UIActions } from './ui';
import { Synth } from './synth';
import { loadMeta, recordVictory, sanitizeName, storeMeta } from './save';
import { formatTime } from './rng';
import type { GameEvent, RunRecord } from './types';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLElement;

const game = new Game();
const renderer = new Renderer(canvas, game);
const synth = new Synth();
const meta = loadMeta();
synth.setMuted(meta.muted);

let ui!: UI;
let resultToken = 0;
let resultTimer = 0;

const SOUND: Partial<Record<GameEvent['type'], string>> = {
  chop: 'chop',
  mine: 'mine',
  stone: 'stone',
  deposit: 'deposit',
  assign: 'assign',
  'build-start': 'build',
  'build-done': 'build-done',
  train: 'train',
  militia: 'militia',
  arrow: 'arrow',
  clash: 'clash',
  'arrow-hit': 'arrow-hit',
  kill: 'kill',
  'villager-death': 'villager-death',
  destroy: 'destroy',
  horn: 'horn',
  raid: 'raid',
  age: 'age',
  victory: 'victory',
  defeat: 'defeat',
  click: 'click',
  error: 'error',
};

function startRun(): void {
  resultToken += 1;
  if (resultTimer) {
    window.clearTimeout(resultTimer);
    resultTimer = 0;
  }
  meta.name = sanitizeName(meta.name);
  meta.plays += 1;
  storeMeta(meta);
  synth.ensure();
  game.startRun();
  ui.hideOverlay();
  ui.toast('Hedef: İmparatorluk Çağı');
}

function quitToTitle(): void {
  resultToken += 1;
  if (resultTimer) {
    window.clearTimeout(resultTimer);
    resultTimer = 0;
  }
  game.toTitle();
  ui.showTitle();
}

function togglePause(): void {
  if (game.state.phase === 'playing') {
    game.pause();
    ui.showPause();
  } else if (game.state.phase === 'paused') {
    game.resume();
    ui.hideOverlay();
  }
}

function share(): void {
  const res = game.state.result;
  if (!res?.win) return;
  const text = `3 Dakikalık İmparatorluk — ${formatTime(res.time)} · ${meta.name}`;
  const done = (): void => ui.toast('Sonuç kopyalandı');
  const fail = (): void => ui.toast('Panoya kopyalanamadı');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fail);
  } else {
    fail();
  }
}

const actions: UIActions = {
  start: startRun,
  restart: startRun,
  quit: quitToTitle,
  pauseOnly: () => game.pause(),
  togglePause,
  setName: (name) => {
    meta.name = sanitizeName(name);
    storeMeta(meta);
  },
  toggleMute: () => {
    meta.muted = !meta.muted;
    synth.setMuted(meta.muted);
    storeMeta(meta);
  },
  share,
  unlockAudio: () => synth.ensure(),
  trainVillager: () => {
    game.trainVillager();
  },
  trainMilitia: () => {
    game.trainMilitia();
  },
  researchAge: () => {
    game.researchAge();
  },
  beginBuild: (kind) => {
    game.beginBuild(kind);
  },
};

function finishRun(win: boolean): void {
  const s = game.state;
  if (!s.result) return;
  let record: RunRecord | null = null;
  if (win) {
    record = recordVictory(meta, s.result.time, s.stats.age2Time, s.stats.kills);
  }
  const token = resultToken;
  if (resultTimer) window.clearTimeout(resultTimer);
  resultTimer = window.setTimeout(
    () => {
      if (token !== resultToken) return;
      resultTimer = 0;
      ui.hideTip();
      ui.showResult(game.state, record);
    },
    win ? 1100 : 750,
  );
}

function handleEvent(e: GameEvent): void {
  renderer.fx(e);
  const sound = SOUND[e.type];
  if (sound) synth.play(sound);

  switch (e.type) {
    case 'deposit':
      ui.pulse(e.resource);
      break;
    case 'error':
      ui.toast(e.message);
      break;
    case 'raid':
      ui.showRaid(e.side);
      break;
    case 'age':
      if (e.age === 1) ui.toast('Çağ II — Krallık Çağı');
      break;
    case 'victory':
      finishRun(true);
      break;
    case 'defeat':
      finishRun(false);
      break;
    default:
      break;
  }
}

function fitCanvas(): void {
  const r = stage.getBoundingClientRect();
  if (r.width < 20 || r.height < 20) return;
  const scale = Math.min(r.width / 480, r.height / 270);
  canvas.style.width = `${Math.max(240, Math.floor(480 * scale))}px`;
  canvas.style.height = `${Math.max(135, Math.floor(270 * scale))}px`;
}

ui = new UI(game, meta, actions);
new Input(canvas, game, renderer, {
  togglePause,
  unlockAudio: () => synth.ensure(),
  showTip: (text, x, y) => ui.showTip(text, x, y),
  hideTip: () => ui.hideTip(),
  isBlocked: () => ui.isOverlayOpen(),
});

ui.showTitle();
fitCanvas();
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => fitCanvas());
  ro.observe(stage);
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('pointerdown', () => synth.ensure(), { once: true });
window.addEventListener('keydown', () => synth.ensure(), { once: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state.phase === 'playing') {
    game.pause();
    ui.showPause();
  }
});

let prev = performance.now();
let acc = 0;

function frame(now: number): void {
  const dt = Math.min(0.1, Math.max(0, (now - prev) / 1000));
  prev = now;

  if (game.state.phase === 'playing') {
    acc += dt;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 8 && game.state.phase === 'playing') {
      game.tick(1 / 60);
      acc -= 1 / 60;
      steps += 1;
    }
    if (game.state.phase !== 'playing') acc = 0;
  } else {
    acc = 0;
  }

  for (const e of game.drainEvents()) handleEvent(e);

  renderer.render(game.state, now / 1000);
  ui.sync(game.state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

const hooks = window as unknown as {
  __game: Game;
  __ui: UI;
  __meta: typeof meta;
  __synth: Synth;
  __startRun: () => void;
};
hooks.__game = game;
hooks.__ui = ui;
hooks.__meta = meta;
hooks.__synth = synth;
hooks.__startRun = startRun;
