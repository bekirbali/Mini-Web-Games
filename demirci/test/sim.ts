/* Headless durum makinesi simülasyonu — tarayıcı gerekmez. */

let fakeNow = 0;
const timers: { at: number; fn: () => void }[] = [];

(globalThis as unknown as { window: unknown }).window = {
  setTimeout: (fn: () => void, ms = 0) => {
    timers.push({ at: fakeNow + ms, fn });
    return timers.length;
  },
  setInterval: () => 0,
  clearInterval: () => undefined,
  clearTimeout: () => undefined,
};

try {
  Object.defineProperty(globalThis, 'performance', {
    value: { now: () => fakeNow },
    configurable: true,
    writable: true,
  });
} catch {
  (globalThis.performance as unknown as { now: () => number }).now = () => fakeNow;
}

(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: () => null,
  setItem: () => undefined,
};

const { Game } = await import('../src/game');

function flushTimers(): void {
  for (let guard = 0; guard < 200; guard += 1) {
    const idx = timers.findIndex((t) => t.at <= fakeNow);
    if (idx === -1) break;
    const [t] = timers.splice(idx, 1);
    t!.fn();
  }
}

type Strategy = 'perfect' | 'decent' | 'boldspam' | 'sloppy' | 'careless';

interface Result {
  strategy: Strategy;
  reachedAuction: boolean;
  phase: string;
  day: number;
  score: number;
  delivered: number;
  burns: number;
  strikes: number;
  gold: number;
  steps: number;
  reason: string;
}

const stanceSets: Record<Strategy, string[]> = {
  perfect: ['normal'],
  decent: ['careful', 'normal', 'bold'],
  boldspam: ['bold'],
  sloppy: ['careful', 'normal'],
  careless: ['normal'],
};

const jitterMs: Record<Strategy, number> = {
  perfect: 0,
  decent: 26,
  boldspam: 20,
  sloppy: 90,
  careless: 520,
};

function play(strategy: Strategy): Result {
  fakeNow = 1000;
  timers.length = 0;

  const game = new Game();
  game.start();

  let steps = 0;
  let reachedAuction = false;

  while (game.state.phase !== 'ended' && steps < 60000) {
    steps += 1;
    flushTimers();
    game.tick(fakeNow);
    const s = game.state;

    switch (s.phase) {
      case 'title':
        game.start();
        break;

      case 'dayIntro':
        game.openShop();
        break;

      case 'arrive':
        if (Math.random() < 0.08) game.reject();
        else game.accept();
        break;

      case 'stance': {
        const allowed = stanceSets[strategy].filter((id) => game.canUseStance(id));
        const set = allowed.length > 0 ? allowed : ['normal'];
        game.chooseStance(set[Math.floor(Math.random() * set.length)]!);
        break;
      }

      case 'strike': {
        const centerTime = s.barStart + (0.25 / s.barSpeed) * 1000;
        const at = centerTime + (Math.random() - 0.5) * jitterMs[strategy];
        fakeNow = Math.max(fakeNow, at);
        game.strike(at);
        break;
      }

      case 'result':
        fakeNow += 1400;
        game.tick(fakeNow);
        break;

      case 'rescue':
        if (s.scrolls > 0) game.resolveRescue('scroll');
        else if (s.upgrades.anvil > 0) game.resolveRescue('anvil');
        else game.resolveRescue('none');
        break;

      case 'shop':
        if (Math.random() < 0.85 && s.gold >= game.shopCost()) {
          const pick = s.shopOptions[Math.floor(Math.random() * s.shopOptions.length)]!;
          game.pickUpgrade(pick.id);
        } else {
          game.skipShop();
        }
        break;

      case 'ownForgeIntro':
        reachedAuction = true;
        game.startOwnForge();
        break;

      case 'auction': {
        const a = s.auction!;
        if (a.round >= 4 || Math.random() < 0.3) game.auctionSell();
        else game.auctionContinue();
        break;
      }

      default:
        break;
    }

    fakeNow += 16;
  }

  const s = game.state;
  return {
    strategy,
    reachedAuction,
    phase: s.phase,
    day: s.day,
    score: s.score,
    delivered: s.stats.delivered,
    burns: s.stats.burns,
    strikes: s.stats.strikes,
    gold: Math.round(s.gold),
    steps,
    reason: s.endReason,
  };
}

const strategies: Strategy[] = ['perfect', 'decent', 'boldspam', 'sloppy', 'careless'];
const runsPer = 14;
const all: Result[] = [];

for (const st of strategies) {
  for (let i = 0; i < runsPer; i += 1) {
    all.push(play(st));
  }
}

console.log('\n=== SİMÜLASYON ===\n');
for (const st of strategies) {
  const rows = all.filter((r) => r.strategy === st);
  const avg = (f: (r: Result) => number) => (rows.reduce((a, b) => a + f(b), 0) / rows.length).toFixed(1);
  const auctions = rows.filter((r) => r.reachedAuction).length;
  const ended = rows.filter((r) => r.phase === 'ended').length;
  console.log(
    `${st.padEnd(9)} | biten ${ended}/${rows.length} | müzayede ${auctions}/${rows.length} | ` +
      `ortalama skor ${avg((r) => r.score)} | teslim ${avg((r) => r.delivered)} | ` +
      `yanma ${avg((r) => r.burns)} | vuruş ${avg((r) => r.strikes)} | gün ${avg((r) => r.day)}`,
  );
}

const stuck = all.filter((r) => r.phase !== 'ended');
if (stuck.length > 0) {
  console.log('\nTAKILANLAR:');
  for (const r of stuck.slice(0, 5)) console.log(r);
  process.exitCode = 1;
} else {
  console.log('\nTüm koşular sonlandı. Durum makinesi sağlam.');
}
