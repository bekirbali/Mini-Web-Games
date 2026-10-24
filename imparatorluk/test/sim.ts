import { Game } from '../src/game';
import { AGES, AGE_III_COST, AGE_II_COST, BUILDINGS, MATCH_SECONDS, MILITIA_COST, VILLAGER_COST, VILLAGER_LIMIT, WAVES } from '../src/config';
import type { ResourceKind, Unit } from '../src/types';

/**
 * Deterministic headless balance bots.
 *
 * They only use the same commands a player has (select + assign, train,
 * research, place) plus direct order repair for stalled construction sites,
 * which the UI does implicitly by re-clicking the site.
 */

interface BotConfig {
  name: string;
  villagerTarget: number;
  militiaTarget: number;
  age2MinVillagers: number;
  towerAt: number;
  pullVillagers: boolean;
  repairBuilds: boolean;
}

interface RunResult {
  name: string;
  win: boolean;
  reason: string;
  time: number;
  age2: number | null;
  kills: number;
  lost: number;
  gathered: number;
  villagers: number;
  militia: number;
  resources: { wood: number; gold: number; stone: number };
}

const CONFIGS: BotConfig[] = [
  {
    name: 'dengeli',
    villagerTarget: 7,
    militiaTarget: 2,
    age2MinVillagers: 4,
    towerAt: 14,
    pullVillagers: true,
    repairBuilds: true,
  },
  {
    name: 'uzman',
    villagerTarget: 5,
    militiaTarget: 1,
    age2MinVillagers: 4,
    towerAt: 14,
    pullVillagers: true,
    repairBuilds: true,
  },
  {
    name: 'sadece-ekonomi',
    villagerTarget: 8,
    militiaTarget: 0,
    age2MinVillagers: 6,
    towerAt: 999,
    pullVillagers: false,
    repairBuilds: true,
  },
  {
    name: 'bos',
    villagerTarget: 3,
    militiaTarget: 0,
    age2MinVillagers: 99,
    towerAt: 999,
    pullVillagers: false,
    repairBuilds: false,
  },
];

const BUILD_SPOTS = {
  tower: { x: 255, y: 140 },
  barracks: { x: 292, y: 160 },
} as const;

function tickFor(g: Game, seconds: number): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps && g.state.phase === 'playing'; i += 1) g.tick(1 / 60);
}

function villagerList(g: Game): Unit[] {
  return g.villagers().filter((u) => !u.dead);
}

function nearestVillager(g: Game, x: number, y: number): Unit | undefined {
  let best: Unit | undefined;
  let bestD = Infinity;
  for (const u of villagerList(g)) {
    const d = Math.hypot(u.x - x, u.y - y);
    if (d < bestD) {
      best = u;
      bestD = d;
    }
  }
  return best;
}

function hasBuilding(g: Game, kind: 'tower' | 'barracks', includeSite: boolean): boolean {
  return g.state.buildings.some(
    (b) =>
      b.kind === kind &&
      b.state !== 'destroyed' &&
      (includeSite || b.state === 'active'),
  );
}

function setSelection(g: Game, units: Unit[]): void {
  g.state.selection = units.map((u) => u.id);
  g.state.selectedBuilding = null;
}

function assign(g: Game, units: Unit[], kind: ResourceKind): void {
  if (!units.length) return;
  setSelection(g, units);
  g.assignSelected(kind);
}

function moveTo(g: Game, units: Unit[], x: number, y: number): void {
  if (!units.length) return;
  setSelection(g, units);
  g.issueAt(x, y);
}

function train(g: Game, cfg: BotConfig): void {
  const s = g.state;
  const tc = g.activeBuilding('tc');
  if (!tc) return;
  const queued = tc.queue;
  const count = g.villagerCount();
  if (count + queued >= Math.min(cfg.villagerTarget, VILLAGER_LIMIT)) return;
  if (s.age === 0 && count + queued >= cfg.age2MinVillagers) return;
  if (
    s.age >= 1 &&
    (!hasBuilding(g, 'tower', false) || !hasBuilding(g, 'barracks', false)) &&
    count + queued >= 5
  ) {
    return;
  }
  if (g.canTrainVillager()) g.trainVillager();
}

function defense(g: Game, cfg: BotConfig, pulledWave: number): { pulledWave: number; defending: boolean } {
  const s = g.state;
  if (!cfg.pullVillagers) {
    return { pulledWave, defending: !!s.warning || g.enemies().length > 0 };
  }
  const next = WAVES[s.waveIndex];
  const earlyWindow = !!next && next.at - s.time <= 6 && pulledWave === s.waveIndex;
  const soon = !!next && next.at - s.time <= 6 && pulledWave !== s.waveIndex;
  const threat = !!s.warning || g.enemies().length > 0;
  const defending = earlyWindow || soon || threat;
  if (defending) {
    const shelter = villagerList(g).filter((u) => u.order?.type !== 'build');
    if (shelter.length) moveTo(g, shelter, 250, 148);
  }
  if (soon) return { pulledWave: s.waveIndex, defending: true };
  return { pulledWave, defending };
}

function repairSites(g: Game, cfg: BotConfig): void {
  if (!cfg.repairBuilds) return;
  for (const b of g.state.buildings) {
    if (b.state !== 'building') continue;
    const working = g.state.units.some(
      (u) => !u.dead && u.order?.type === 'build' && u.order.buildingId === b.id,
    );
    if (working) continue;
    const v = nearestVillager(g, b.x, b.y);
    if (!v) continue;
    if (v.order?.type === 'build') continue;
    v.order = { type: 'build', buildingId: b.id };
    v.buildId = b.id;
    v.state = 'moving';
    v.dropoff = v.carry > 0;
    v.fleeing = false;
  }
}

function place(g: Game, kind: 'tower' | 'barracks'): boolean {
  if (hasBuilding(g, kind, true)) return false;
  if (kind === 'barracks' && g.state.age < 1) return false;
  const spot = BUILD_SPOTS[kind];
  if (!g.affordable(BUILDINGS[kind].cost)) return false;
  if (!g.canPlaceAt(kind, spot.x, spot.y)) return false;
  g.beginBuild(kind);
  g.tryPlace(spot.x, spot.y);
  return true;
}

function economy(g: Game, cfg: BotConfig): void {
  const s = g.state;
  const workers = villagerList(g).filter(
    (u) => !u.dead && u.order?.type !== 'build' && !u.fleeing,
  );
  if (!workers.length) return;

  const towerDone = hasBuilding(g, 'tower', false);
  const barracksDone = hasBuilding(g, 'barracks', false);
  const towerPlaced = hasBuilding(g, 'tower', true);
  const towerWood = BUILDINGS.tower.cost.wood ?? 0;
  const towerStone = BUILDINGS.tower.cost.stone ?? 0;
  const barracksWood = BUILDINGS.barracks.cost.wood ?? 0;
  const barracksGold = BUILDINGS.barracks.cost.gold ?? 0;
  const age3Pending = s.age === 1 && !s.research;
  const needStone =
    (towerPlaced ? 0 : towerStone) +
    (age3Pending && towerDone && barracksDone ? AGE_III_COST.stone : 0);
  const stoneNow = s.resources.stone;
  const stoneWorkers = stoneNow < needStone && s.time >= 8 ? 1 : 0;
  const rest = workers.length - stoneWorkers;

  const ageWood = s.age === 0 ? AGE_II_COST.wood : s.age === 1 ? AGE_III_COST.wood : 0;
  const ageGold = s.age === 0 ? AGE_II_COST.gold : s.age === 1 ? AGE_III_COST.gold : 0;
  const buildWood = (towerDone ? 0 : towerWood) + (barracksDone ? 0 : barracksWood);
  const buildGold = barracksDone ? 0 : barracksGold;
  const woodNeed = Math.max(0, ageWood + buildWood - s.resources.wood);
  const goldNeed = Math.max(0, ageGold + buildGold - s.resources.gold);
  const ratio = Math.min(0.65, Math.max(0.5, woodNeed + goldNeed > 0 ? woodNeed / (woodNeed + goldNeed) : 0.55));
  const woodWorkers = Math.max(0, Math.min(rest, Math.round(rest * ratio)));

  const sorted = workers.slice().sort((a, b) => a.idNum - b.idNum);
  const stoneGroup = sorted.slice(0, stoneWorkers);
  const woodGroup = sorted.slice(stoneWorkers, stoneWorkers + woodWorkers);
  const goldGroup = sorted.slice(stoneWorkers + woodWorkers);

  const wants: Array<[Unit[], ResourceKind]> = [
    [stoneGroup, 'stone'],
    [woodGroup, 'wood'],
    [goldGroup, 'gold'],
  ];
  for (const [group, kind] of wants) {
    for (const u of group) {
      const order = u.order;
      if (order && order.type === 'gather') {
        const node = g.node(order.nodeId);
        if (node && node.kind === kind && node.reserve > 0) continue;
      }
      assign(g, [u], kind);
    }
  }
}

interface BotState {
  pulledWave: number;
  defending: boolean;
}

function decide(g: Game, cfg: BotConfig, state: BotState): BotState {
  const s = g.state;
  if (s.phase !== 'playing') return state;

  const pulled = defense(g, cfg, state.pulledWave);
  state.pulledWave = pulled.pulledWave;
  state.defending = pulled.defending;

  repairSites(g, cfg);

  if (cfg.towerAt < 900 && !hasBuilding(g, 'tower', true) && s.time >= cfg.towerAt) {
    place(g, 'tower');
  }

  if (s.age === 0 && !s.research && g.villagerCount() >= cfg.age2MinVillagers) {
    if (g.canResearchAge()) g.researchAge();
  }

  if (s.age >= 1 && !hasBuilding(g, 'barracks', true)) {
    place(g, 'barracks');
  }

  if (s.age === 1 && !s.research && hasBuilding(g, 'tower', true) && hasBuilding(g, 'barracks', true)) {
    if (g.canResearchAge()) g.researchAge();
  }

  if (!state.defending) train(g, cfg);

  if (s.age >= 1 && g.militiaCount() < cfg.militiaTarget) {
    const threat = !!s.warning || g.enemies().length > 0;
    const b = g.activeBuilding('barracks');
    if ((s.time >= 50 || threat) && b && g.militiaCount() + b.queue < cfg.militiaTarget && g.canTrainMilitia()) {
      g.trainMilitia();
    }
  }

  if (!state.defending) economy(g, cfg);

  return state;
}

function runBot(cfg: BotConfig): RunResult {
  const g = new Game();
  g.startRun();
  const state: BotState = { pulledWave: -1, defending: false };
  let nextDecision = 0;
  let nextLog = 10;

  while (g.state.phase === 'playing' && g.state.time < MATCH_SECONDS) {
    if (g.state.time >= nextDecision) {
      decide(g, cfg, state);
      nextDecision = g.state.time + 0.5;
    }
    g.tick(1 / 60);
    if (process.env.SIM_DEBUG === '1' && cfg.name === 'dengeli' && g.state.time >= nextLog) {
      const s = g.state;
      nextLog += 10;
      console.log(
        `t=${s.time.toFixed(1)} age=${s.age} res=${Math.round(s.resources.wood)}/${Math.round(s.resources.gold)}/${Math.round(s.resources.stone)} ` +
          `v=${g.villagerCount()} enemies=${g.enemies().length} def=${state.defending} ` +
          `b=${s.buildings.map((b) => `${b.kind}:${b.state}:${b.progress.toFixed(2)}`).join(',')} ` +
          `orders=${g.villagers().map((u) => `${u.id}:${u.order?.type ?? '-'}:${u.state}`).join(' ')}`,
      );
    }
  }

  const s = g.state;
  const res = s.result;
  if (process.env.SIM_DEBUG === '1' && cfg.name === 'dengeli') {
    const events = g.drainEvents();
    const errors = events.filter((e) => e.type === 'error').map((e) => (e as { message: string }).message);
    console.log('errors:', errors.slice(0, 40));
    console.log('build events:', events.filter((e) => e.type === 'build-done' || e.type === 'destroy').length);
  }
  return {
    name: cfg.name,
    win: s.phase === 'victory',
    reason: res?.reason ?? (s.time >= MATCH_SECONDS ? 'time' : 'unknown'),
    time: res?.time ?? s.time,
    age2: res?.age2Time ?? s.stats.age2Time,
    kills: s.stats.kills,
    lost: s.stats.lostVillagers,
    gathered: Math.round(s.stats.gathered),
    villagers: g.villagerCount(),
    militia: g.militiaCount(),
    resources: { ...s.resources },
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
}

const results = CONFIGS.map(runBot);
const started = Date.now();
for (const r of results) {
  const ageText = r.age2 === null ? '—' : r.age2.toFixed(1);
  console.log(
    [
      r.name.padEnd(14),
      (r.win ? 'ZAFER' : 'YENİLGİ').padEnd(8),
      `${r.time.toFixed(1).padStart(6)}s`,
      `çağ2 ${ageText.padStart(5)}`,
      `öldürme ${String(r.kills).padStart(2)}`,
      `kayıp ${String(r.lost).padStart(2)}`,
      `toplanan ${String(r.gathered).padStart(4)}`,
      `köylü ${r.villagers}`,
      `milis ${r.militia}`,
      `kaynak ${Math.round(r.resources.wood)}/${Math.round(r.resources.gold)}/${Math.round(r.resources.stone)}`,
    ].join('  '),
  );
}

const balanced = results.find((r) => r.name === 'dengeli')!;
const expert = results.find((r) => r.name === 'uzman')!;
const idle = results.find((r) => r.name === 'bos')!;
const economyOnly = results.find((r) => r.name === 'sadece-ekonomi')!;

assert(balanced.win, 'dengeli bot 180 saniye içinde kazanmalı');
assert(balanced.time < 150, `dengeli bot 150 saniyeden hızlı bitirmeli (${balanced.time.toFixed(1)})`);
assert(expert.win, 'uzman bot kazanmalı');
assert(expert.time <= 110, `uzman bot 1:50'den hızlı bitirmeli (${expert.time.toFixed(1)})`);
assert(expert.time < balanced.time, 'uzman bot dengeli bottan hızlı olmalı');
assert(!idle.win, 'boş bot kaybetmeli');
assert(!economyOnly.win, 'savunmasız ekonomi botu kaybetmeli');
assert(balanced.age2 !== null && balanced.age2 < balanced.time, 'çağ 2 zamanı zaferden önce olmalı');
assert(balanced.kills >= 2, 'dengeli bot en az bir akını püskürtmeli');

console.log(`\n${results.length} bot, ${((Date.now() - started) / 1000).toFixed(2)} sn`);
console.log(`Çağ isimleri: ${AGES.map((a) => a.short).join(' → ')}`);
console.log(`Maliyetler: köylü ${VILLAGER_COST.wood}w/${VILLAGER_COST.gold}g, milis ${MILITIA_COST.wood}w/${MILITIA_COST.gold}g, Çağ III ${AGE_III_COST.wood}w/${AGE_III_COST.gold}g/${AGE_III_COST.stone}s`);
