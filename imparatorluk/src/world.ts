import { BUILDINGS, START_RESOURCES, UNIT_STATS, VILLAGER_LIMIT } from './config';
import type { Building, GameState, Phase, ResourceNode, Unit, UnitKind } from './types';

export const TC_POS = { x: 240, y: 176 };

export const NODE_DEFS: ResourceNode[] = [
  { id: 'wood-w', kind: 'wood', name: 'Batı Ormanı', x: 64, y: 96, radius: 25, reserve: 260, maxReserve: 260 },
  { id: 'wood-s', kind: 'wood', name: 'Güney Korusu', x: 100, y: 150, radius: 22, reserve: 220, maxReserve: 220 },
  { id: 'gold-e', kind: 'gold', name: 'Doğu Damarı', x: 398, y: 96, radius: 18, reserve: 180, maxReserve: 180 },
  { id: 'gold-s', kind: 'gold', name: 'Güney Damarı', x: 424, y: 152, radius: 16, reserve: 160, maxReserve: 160 },
  { id: 'stone-n', kind: 'stone', name: 'Kuzey Ocağı', x: 292, y: 54, radius: 15, reserve: 140, maxReserve: 140 },
  { id: 'stone-w', kind: 'stone', name: 'Batı Ocağı', x: 168, y: 54, radius: 14, reserve: 120, maxReserve: 120 },
];

export const VILLAGER_STARTS = [
  { x: 224, y: 202 },
  { x: 240, y: 207 },
  { x: 256, y: 202 },
];

let nextId = 1;

export function makeUnit(kind: UnitKind, x: number, y: number, idNum: number): Unit {
  const s = UNIT_STATS[kind];
  return {
    id: `u${nextId++}`,
    idNum,
    kind,
    x,
    y,
    hp: s.hp,
    maxHp: s.hp,
    speed: s.speed,
    dmg: s.dmg,
    range: s.range,
    attackCd: s.attackCd,
    state: 'idle',
    cooldown: 0,
    anim: 0,
    facing: 1,
    flash: 0,
    order: null,
    nodeId: null,
    carry: 0,
    carryType: null,
    dropoff: false,
    buildId: null,
    fleeing: false,
    safeTimer: 0,
    attackId: null,
    attackKind: null,
    retarget: 0,
    anchorX: x,
    anchorY: y,
    dead: false,
  };
}

export function makeTC(x = TC_POS.x, y = TC_POS.y): Building {
  const def = BUILDINGS.tc;
  return {
    id: 'tc',
    kind: 'tc',
    x,
    y,
    w: def.w,
    h: def.h,
    hp: def.hp,
    maxHp: def.hp,
    state: 'active',
    progress: 1,
    builders: 0,
    queue: 0,
    trainTimer: 0,
    cooldown: 0,
    targetId: null,
    flash: 0,
  };
}

export function createState(phase: Phase): GameState {
  nextId = 1;
  const units = VILLAGER_STARTS.map((p, i) => makeUnit('villager', p.x, p.y, i + 1));
  return {
    phase,
    time: 0,
    resources: { ...START_RESOURCES },
    age: 0,
    units,
    buildings: [makeTC()],
    nodes: NODE_DEFS.map((n) => ({ ...n })),
    projectiles: [],
    selection: [],
    selectedBuilding: null,
    placement: null,
    research: null,
    waveIndex: 0,
    warning: null,
    stats: {
      kills: 0,
      lostVillagers: 0,
      gathered: 0,
      trained: 0,
      raids: 0,
      age2Time: null,
      firstAssign: false,
    },
    lastAssign: null,
    result: null,
    tick: 0,
    version: 0,
  };
}

export const VILLAGER_LIMIT_VALUE = VILLAGER_LIMIT;

/** Sabit dekor: çiçek, taş, kuru ot. Render tarafında kullanılır. */
export const DECOR = [
  { x: 32, y: 58, kind: 'flower' },
  { x: 148, y: 108, kind: 'flower' },
  { x: 336, y: 186, kind: 'flower' },
  { x: 384, y: 52, kind: 'flower' },
  { x: 210, y: 120, kind: 'flower' },
  { x: 60, y: 196, kind: 'flower' },
  { x: 360, y: 230, kind: 'flower' },
  { x: 122, y: 232, kind: 'flower' },
  { x: 176, y: 82, kind: 'rock' },
  { x: 344, y: 118, kind: 'rock' },
  { x: 272, y: 232, kind: 'rock' },
  { x: 28, y: 232, kind: 'rock' },
  { x: 438, y: 214, kind: 'rock' },
  { x: 118, y: 184, kind: 'grass' },
  { x: 204, y: 96, kind: 'grass' },
  { x: 320, y: 156, kind: 'grass' },
  { x: 404, y: 190, kind: 'grass' },
  { x: 286, y: 200, kind: 'grass' },
  { x: 68, y: 132, kind: 'grass' },
  { x: 352, y: 70, kind: 'grass' },
] as const;

export const WATER_HOLE = { x: 356, y: 240, r: 14 };
