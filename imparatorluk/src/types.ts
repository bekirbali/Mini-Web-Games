export type Phase = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';

export type ResourceKind = 'wood' | 'gold' | 'stone';

export type UnitKind = 'villager' | 'militia' | 'raider' | 'warrior' | 'chief';

export type UnitState = 'idle' | 'moving' | 'gathering' | 'building' | 'fighting' | 'dead';

export type BuildingKind = 'tc' | 'tower' | 'barracks';

export type BuildingState = 'building' | 'active' | 'destroyed';

export type Side = 'west' | 'east' | 'north' | 'south';

export interface Resources {
  wood: number;
  gold: number;
  stone: number;
}

export interface ResourceNode {
  id: string;
  kind: ResourceKind;
  name: string;
  x: number;
  y: number;
  radius: number;
  reserve: number;
  maxReserve: number;
}

export type Order =
  | { type: 'gather'; nodeId: string }
  | { type: 'build'; buildingId: string }
  | { type: 'move'; x: number; y: number };

export interface Unit {
  id: string;
  idNum: number;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  range: number;
  attackCd: number;
  state: UnitState;
  cooldown: number;
  anim: number;
  facing: 1 | -1;
  flash: number;
  order: Order | null;
  nodeId: string | null;
  carry: number;
  carryType: ResourceKind | null;
  dropoff: boolean;
  buildId: string | null;
  fleeing: boolean;
  safeTimer: number;
  attackId: string | null;
  attackKind: 'unit' | 'building' | null;
  retarget: number;
  anchorX: number;
  anchorY: number;
  dead: boolean;
}

export interface Building {
  id: string;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  state: BuildingState;
  progress: number;
  builders: number;
  queue: number;
  trainTimer: number;
  cooldown: number;
  targetId: string | null;
  flash: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  targetId: string;
  speed: number;
  dmg: number;
  ttl: number;
}

export interface Stats {
  kills: number;
  lostVillagers: number;
  gathered: number;
  trained: number;
  raids: number;
  age2Time: number | null;
  firstAssign: boolean;
}

export interface ResultInfo {
  win: boolean;
  reason: 'imperial' | 'tc' | 'time';
  time: number;
  age2Time: number | null;
}

export interface Warning {
  side: Side;
  remaining: number;
  index: number;
}

export interface Research {
  target: 1 | 2;
  remaining: number;
  total: number;
}

export interface GameState {
  phase: Phase;
  time: number;
  resources: Resources;
  age: number;
  units: Unit[];
  buildings: Building[];
  nodes: ResourceNode[];
  projectiles: Projectile[];
  selection: string[];
  selectedBuilding: string | null;
  placement: BuildingKind | null;
  research: Research | null;
  waveIndex: number;
  warning: Warning | null;
  stats: Stats;
  lastAssign: ResourceKind | null;
  result: ResultInfo | null;
  tick: number;
  version: number;
}

export type GameEvent =
  | { type: 'chop'; x: number; y: number }
  | { type: 'mine'; x: number; y: number }
  | { type: 'stone'; x: number; y: number }
  | { type: 'deposit'; x: number; y: number; resource: ResourceKind; amount: number }
  | { type: 'assign'; x: number; y: number; resource: ResourceKind }
  | { type: 'build-start'; x: number; y: number }
  | { type: 'build-done'; x: number; y: number }
  | { type: 'train'; x: number; y: number }
  | { type: 'militia'; x: number; y: number }
  | { type: 'arrow'; x: number; y: number; tx: number; ty: number }
  | { type: 'clash'; x: number; y: number }
  | { type: 'arrow-hit'; x: number; y: number }
  | { type: 'kill'; x: number; y: number; loot: number }
  | { type: 'villager-death'; x: number; y: number }
  | { type: 'destroy'; x: number; y: number }
  | { type: 'horn'; side: Side }
  | { type: 'raid'; side: Side }
  | { type: 'age'; age: number }
  | { type: 'error'; message: string }
  | { type: 'click' }
  | { type: 'victory'; time: number }
  | { type: 'defeat'; reason: 'tc' | 'time' };

export interface Meta {
  name: string;
  muted: boolean;
  plays: number;
  board: BoardEntry[];
  best: { time: number; age2: number | null } | null;
  tutorialSeen: boolean;
}

export interface BoardEntry {
  name: string;
  time: number;
  age2: number | null;
  kills: number;
  date: number;
}

export interface RunRecord {
  rank: number;
  isBest: boolean;
  entry: BoardEntry;
}

export interface PickResult {
  type: 'unit' | 'building' | 'node' | 'none';
  id?: string;
  x: number;
  y: number;
}
