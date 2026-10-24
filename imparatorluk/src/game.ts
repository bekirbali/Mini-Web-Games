import {
  AGE_II_COST,
  AGE_II_TIME,
  AGE_III_COST,
  AGE_III_TIME,
  BARRACKS_QUEUE_LIMIT,
  BUILDINGS,
  GATHER,
  MAP_MARGIN,
  MATCH_SECONDS,
  MILITIA_COST,
  MILITIA_LIMIT,
  MILITIA_TIME,
  RESOURCES,
  TC_QUEUE_LIMIT,
  UNIT_STATS,
  VILLAGER_COST,
  VILLAGER_LIMIT,
  VILLAGER_TIME,
  W,
  H,
  WARNING_TIME,
  WAVES,
} from './config';
import { clamp, dist, formatClock } from './rng';
import type {
  Building,
  BuildingKind,
  GameEvent,
  GameState,
  Phase,
  PickResult,
  Projectile,
  ResourceKind,
  ResourceNode,
  Side,
  Unit,
  UnitKind,
  UnitState,
} from './types';
import { createState, makeUnit, TC_POS } from './world';

type Cost = Partial<Record<ResourceKind, number>>;

const STATE_LABEL: Record<UnitState, string> = {
  idle: 'Boşta',
  moving: 'Yürüyor',
  gathering: 'Topluyor',
  building: 'İnşa ediyor',
  fighting: 'Savaşıyor',
  dead: 'Öldü',
};

const KIND_LABEL: Record<UnitKind, string> = {
  villager: 'Köylü',
  militia: 'Milis',
  raider: 'Akıncı',
  warrior: 'Savaşçı',
  chief: 'Şef',
};

function isEnemy(kind: UnitKind): boolean {
  return kind === 'raider' || kind === 'warrior' || kind === 'chief';
}

function isPlayerUnit(kind: UnitKind): boolean {
  return kind === 'villager' || kind === 'militia';
}

function aabbDist(px: number, py: number, b: Building): number {
  const dx = Math.max(b.x - b.w / 2 - px, 0, px - (b.x + b.w / 2));
  const dy = Math.max(b.y - b.h / 2 - py, 0, py - (b.y + b.h / 2));
  return Math.hypot(dx, dy);
}

export class Game {
  state: GameState;
  private events: GameEvent[] = [];
  private unitSeq = 1;
  private projectileSeq = 1;
  private buildingSeq = 1;
  onFinish: ((state: GameState) => void) | null = null;

  constructor() {
    this.state = createState('title');
  }

  reset(phase: Phase = 'playing'): void {
    this.state = createState(phase);
    this.events = [];
    this.unitSeq = 1;
    this.projectileSeq = 1;
    this.buildingSeq = 1;
  }

  startRun(): void {
    this.reset('playing');
    this.emit({ type: 'click' });
  }

  pause(): void {
    if (this.state.phase === 'playing') {
      this.state.phase = 'paused';
      this.emit({ type: 'click' });
    }
  }

  resume(): void {
    if (this.state.phase === 'paused') {
      this.state.phase = 'playing';
      this.emit({ type: 'click' });
    }
  }

  toTitle(): void {
    this.reset('title');
  }

  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(e: GameEvent): void {
    this.events.push(e);
  }

  private bump(): void {
    this.state.version += 1;
  }

  // ---------------------------------------------------------------- helpers

  tc(): Building | undefined {
    return this.state.buildings.find((b) => b.kind === 'tc');
  }

  villagers(): Unit[] {
    return this.state.units.filter((u) => u.kind === 'villager' && !u.dead);
  }

  militia(): Unit[] {
    return this.state.units.filter((u) => u.kind === 'militia' && !u.dead);
  }

  enemies(): Unit[] {
    return this.state.units.filter((u) => isEnemy(u.kind) && !u.dead);
  }

  selectedUnits(): Unit[] {
    const ids = new Set(this.state.selection);
    return this.state.units.filter((u) => ids.has(u.id) && !u.dead && isPlayerUnit(u.kind));
  }

  selectedVillagers(): Unit[] {
    return this.selectedUnits().filter((u) => u.kind === 'villager');
  }

  selectedBuilding(): Building | undefined {
    const id = this.state.selectedBuilding;
    return id ? this.state.buildings.find((b) => b.id === id) : undefined;
  }

  unit(id: string | null): Unit | undefined {
    if (!id) return undefined;
    return this.state.units.find((u) => u.id === id && !u.dead);
  }

  building(id: string | null): Building | undefined {
    if (!id) return undefined;
    return this.state.buildings.find((b) => b.id === id);
  }

  node(id: string | null): ResourceNode | undefined {
    if (!id) return undefined;
    return this.state.nodes.find((n) => n.id === id);
  }

  activeBuilding(kind: BuildingKind): Building | undefined {
    return this.state.buildings.find((b) => b.kind === kind && b.state === 'active');
  }

  hasStructure(kind: BuildingKind): boolean {
    return this.state.buildings.some((b) => b.kind === kind && b.state === 'active');
  }

  villagerCount(): number {
    return this.villagers().length;
  }

  militiaCount(): number {
    return this.militia().length;
  }

  private nextUnitIdNum(): number {
    return this.unitSeq++;
  }

  private canAfford(cost: Cost): boolean {
    return (Object.keys(cost) as ResourceKind[]).every((k) => this.state.resources[k] >= (cost[k] ?? 0));
  }

  private pay(cost: Cost): void {
    for (const k of Object.keys(cost) as ResourceKind[]) {
      this.state.resources[k] -= cost[k] ?? 0;
    }
  }

  private error(message: string): false {
    this.emit({ type: 'error', message });
    return false;
  }

  private nearestNode(kind: ResourceKind, x: number, y: number): ResourceNode | undefined {
    let best: ResourceNode | undefined;
    let bestD = Infinity;
    for (const n of this.state.nodes) {
      if (n.kind !== kind || n.reserve <= 0) continue;
      const d = dist(x, y, n.x, n.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  private nearestVillager(x: number, y: number, idleOnly = false): Unit | undefined {
    let best: Unit | undefined;
    let bestD = Infinity;
    for (const u of this.villagers()) {
      if (idleOnly && u.order) continue;
      const d = dist(x, y, u.x, u.y);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  private nearestEnemy(x: number, y: number, radius: number): Unit | undefined {
    let best: Unit | undefined;
    let bestD = radius;
    for (const u of this.enemies()) {
      const d = dist(x, y, u.x, u.y);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  // --------------------------------------------------------------- selection

  pickAt(x: number, y: number): PickResult {
    let bestUnit: Unit | undefined;
    let bestD = Infinity;
    for (const u of this.state.units) {
      if (u.dead) continue;
      const r = u.kind === 'chief' ? 13 : 8;
      const d = dist(x, y, u.x, u.y - 3);
      if (d <= r && d < bestD) {
        bestD = d;
        bestUnit = u;
      }
    }
    if (bestUnit) return { type: 'unit', id: bestUnit.id, x: bestUnit.x, y: bestUnit.y };

    for (const b of this.state.buildings) {
      if (b.state === 'destroyed') continue;
      if (x >= b.x - b.w / 2 && x <= b.x + b.w / 2 && y >= b.y - b.h / 2 && y <= b.y + b.h / 2) {
        return { type: 'building', id: b.id, x: b.x, y: b.y };
      }
    }

    for (const n of this.state.nodes) {
      if (dist(x, y, n.x, n.y) <= n.radius + 5) {
        return { type: 'node', id: n.id, x: n.x, y: n.y };
      }
    }

    return { type: 'none', x, y };
  }

  selectAt(x: number, y: number, additive = false): void {
    const pick = this.pickAt(x, y);
    const s = this.state;
    if (pick.type === 'unit' && pick.id) {
      const u = this.unit(pick.id);
      if (!u || !isPlayerUnit(u.kind)) {
        if (!additive) {
          s.selection = [];
          s.selectedBuilding = null;
        }
        this.bump();
        return;
      }
      if (!additive) s.selection = [];
      const idx = s.selection.indexOf(u.id);
      if (additive && idx >= 0) s.selection.splice(idx, 1);
      else if (idx < 0) s.selection.push(u.id);
      s.selectedBuilding = null;
      this.bump();
      return;
    }
    if (pick.type === 'building' && pick.id) {
      s.selection = [];
      s.selectedBuilding = pick.id;
      this.bump();
      return;
    }
    if (!additive) {
      s.selection = [];
      s.selectedBuilding = null;
      this.bump();
    }
  }

  selectRect(x1: number, y1: number, x2: number, y2: number, additive = false): void {
    const s = this.state;
    const loX = Math.min(x1, x2);
    const hiX = Math.max(x1, x2);
    const loY = Math.min(y1, y2);
    const hiY = Math.max(y1, y2);
    const hits = this.state.units.filter(
      (u) =>
        !u.dead &&
        isPlayerUnit(u.kind) &&
        u.x >= loX &&
        u.x <= hiX &&
        u.y >= loY &&
        u.y <= hiY,
    );
    if (!additive) s.selection = [];
    for (const u of hits) if (!s.selection.includes(u.id)) s.selection.push(u.id);
    s.selectedBuilding = null;
    this.bump();
  }

  selectAllVillagers(): void {
    this.state.selection = this.villagers().map((u) => u.id);
    this.state.selectedBuilding = null;
    this.bump();
  }

  selectAllMilitia(): void {
    this.state.selection = this.militia().map((u) => u.id);
    this.state.selectedBuilding = null;
    this.bump();
  }

  selectTC(): void {
    const tc = this.tc();
    if (tc) {
      this.state.selection = [];
      this.state.selectedBuilding = tc.id;
      this.bump();
    }
  }

  // --------------------------------------------------------------- commands

  assignSelected(kind: ResourceKind): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    const selected = this.selectedUnits();
    let vs = selected.filter((u) => u.kind === 'villager');
    if (!vs.length && selected.length) {
      this.error('Köylü seç');
      return;
    }
    if (!vs.length) {
      const v = this.nearestVillager(TC_POS.x, TC_POS.y, true);
      if (v) vs = [v];
    }
    if (!vs.length) {
      this.error('Önce bir köylü seç');
      return;
    }
    const node = this.nearestNode(kind, TC_POS.x, TC_POS.y);
    if (!node) {
      this.error(`${RESOURCES[kind].name} yatağı tükendi`);
      return;
    }
    for (const u of vs) this.sendToNode(u, node);
    s.lastAssign = kind;
    s.stats.firstAssign = true;
    s.selection = vs.map((u) => u.id);
    s.selectedBuilding = null;
    this.emit({ type: 'assign', x: node.x, y: node.y, resource: kind });
    this.bump();
  }

  private sendToNode(u: Unit, node: ResourceNode): void {
    if (u.carry > 0 && u.carryType !== node.kind) u.dropoff = true;
    u.order = { type: 'gather', nodeId: node.id };
    u.nodeId = node.id;
    u.fleeing = false;
    u.safeTimer = 0;
    u.state = 'moving';
    u.cooldown = 0;
  }

  issueAt(x: number, y: number): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    if (s.placement) {
      this.tryPlace(x, y);
      return;
    }
    const pick = this.pickAt(x, y);
    if (pick.type === 'node' && pick.id) {
      const node = this.node(pick.id);
      if (!node) return;
      let vs = this.selectedVillagers();
      if (!vs.length) {
        const v = this.nearestVillager(node.x, node.y, true) ?? this.nearestVillager(node.x, node.y);
        if (v) vs = [v];
      }
      if (!vs.length) {
        this.error('Köylü kalmadı');
        return;
      }
      for (const u of vs) this.sendToNode(u, node);
      s.lastAssign = node.kind;
      s.stats.firstAssign = true;
      this.emit({ type: 'assign', x: node.x, y: node.y, resource: node.kind });
      this.bump();
      return;
    }

    const units = this.selectedUnits();
    if (units.length) {
      const n = units.length;
      units.forEach((u, i) => {
        const angle = (i / Math.max(1, n)) * Math.PI * 2;
        const r = n > 1 ? 11 : 0;
        const tx = clamp(x + Math.cos(angle) * r, 12, W - 12);
        const ty = clamp(y + Math.sin(angle) * r, 12, H - 12);
        u.order = { type: 'move', x: tx, y: ty };
        u.state = 'moving';
        if (u.kind === 'militia') {
          u.anchorX = tx;
          u.anchorY = ty;
        }
      });
      this.emit({ type: 'click' });
      this.bump();
      return;
    }

    s.selection = [];
    s.selectedBuilding = null;
    this.bump();
  }

  beginBuild(kind: BuildingKind): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    if (kind === 'barracks' && s.age < 1) {
      this.error('Kışla için önce Çağ II');
      return;
    }
    if (s.placement === kind) {
      s.placement = null;
      this.bump();
      return;
    }
    if (!this.canAfford(BUILDINGS[kind].cost)) {
      this.error(this.costMessage(BUILDINGS[kind].cost));
      return;
    }
    s.placement = kind;
    s.selection = [];
    s.selectedBuilding = null;
    this.emit({ type: 'click' });
    this.bump();
  }

  cancelPlacement(): void {
    if (this.state.placement) {
      this.state.placement = null;
      this.emit({ type: 'click' });
      this.bump();
    }
  }

  canPlaceAt(kind: BuildingKind, x: number, y: number): boolean {
    const def = BUILDINGS[kind];
    if (!def) return false;
    if (x - def.w / 2 < MAP_MARGIN + 2 || x + def.w / 2 > W - MAP_MARGIN - 2) return false;
    if (y - def.h / 2 < MAP_MARGIN + 2 || y + def.h / 2 > H - MAP_MARGIN - 2) return false;
    for (const b of this.state.buildings) {
      if (b.state === 'destroyed') continue;
      const gap = 4;
      if (
        Math.abs(b.x - x) < (b.w + def.w) / 2 + gap &&
        Math.abs(b.y - y) < (b.h + def.h) / 2 + gap
      ) {
        return false;
      }
    }
    for (const n of this.state.nodes) {
      if (dist(x, y, n.x, n.y) < n.radius + Math.max(def.w, def.h) / 2 + 2) return false;
    }
    return true;
  }

  placementReason(kind: BuildingKind, x: number, y: number): string {
    if (this.canPlaceAt(kind, x, y)) return '';
    if (!this.canAfford(BUILDINGS[kind].cost)) return this.costMessage(BUILDINGS[kind].cost);
    return 'Buraya kurulamaz';
  }

  tryPlace(x: number, y: number): void {
    const s = this.state;
    const kind = s.placement;
    if (!kind || s.phase !== 'playing') return;
    if (!this.canPlaceAt(kind, x, y)) {
      this.error(kind === 'tower' ? 'Kule buraya sığmıyor' : 'Buraya kurulamaz');
      return;
    }
    if (!this.canAfford(BUILDINGS[kind].cost)) {
      this.error(this.costMessage(BUILDINGS[kind].cost));
      return;
    }
    this.pay(BUILDINGS[kind].cost);
    const def = BUILDINGS[kind];
    const b: Building = {
      id: `b${this.buildingSeq++}`,
      kind,
      x,
      y,
      w: def.w,
      h: def.h,
      hp: def.hp,
      maxHp: def.hp,
      state: 'building',
      progress: 0,
      builders: 0,
      queue: 0,
      trainTimer: 0,
      cooldown: 0,
      targetId: null,
      flash: 0,
    };
    s.buildings.push(b);
    s.selectedBuilding = b.id;
    s.selection = [];
    s.placement = null;

    const builder = this.nearestVillager(x, y, true) ?? this.nearestVillager(x, y);
    if (builder) {
      builder.order = { type: 'build', buildingId: b.id };
      builder.buildId = b.id;
      builder.state = 'moving';
      builder.fleeing = false;
      builder.dropoff = builder.carry > 0;
    }
    this.emit({ type: 'build-start', x, y });
    this.bump();
  }

  trainVillager(): boolean {
    const s = this.state;
    if (s.phase !== 'playing') return false;
    const tc = this.activeBuilding('tc');
    if (!tc) return this.error('Merkez yok');
    if (tc.queue >= TC_QUEUE_LIMIT) return this.error('Kuyruk dolu');
    if (this.villagerCount() + tc.queue >= VILLAGER_LIMIT) return this.error('Köylü limiti dolu');
    if (!this.canAfford(VILLAGER_COST)) return this.error(this.costMessage(VILLAGER_COST));
    this.pay(VILLAGER_COST);
    tc.queue += 1;
    this.emit({ type: 'click' });
    this.bump();
    return true;
  }

  trainMilitia(): boolean {
    const s = this.state;
    if (s.phase !== 'playing') return false;
    if (s.age < 1) return this.error('Milis için Çağ II gerekli');
    const barracks = this.activeBuilding('barracks');
    if (!barracks) return this.error('Önce kışla kur');
    if (barracks.queue >= BARRACKS_QUEUE_LIMIT) return this.error('Kışla kuyruğu dolu');
    if (this.militiaCount() + barracks.queue >= MILITIA_LIMIT) return this.error('Milis limiti dolu');
    if (!this.canAfford(MILITIA_COST)) return this.error(this.costMessage(MILITIA_COST));
    this.pay(MILITIA_COST);
    barracks.queue += 1;
    this.emit({ type: 'click' });
    this.bump();
    return true;
  }

  researchAge(): boolean {
    const s = this.state;
    if (s.phase !== 'playing') return false;
    if (s.research) return this.error('Zaten araştırma var');
    const tc = this.activeBuilding('tc');
    if (!tc) return this.error('Merkez yok');
    if (s.age >= 2) return false;

    const target = (s.age + 1) as 1 | 2;
    if (target === 2) {
      if (!this.hasStructure('tower') || !this.hasStructure('barracks')) {
        return this.error('İmparatorluk için kule + kışla şart');
      }
    }
    const cost = target === 1 ? AGE_II_COST : AGE_III_COST;
    if (!this.canAfford(cost)) return this.error(this.costMessage(cost));
    this.pay(cost);
    s.research = {
      target,
      remaining: target === 1 ? AGE_II_TIME : AGE_III_TIME,
      total: target === 1 ? AGE_II_TIME : AGE_III_TIME,
    };
    this.emit({ type: 'click' });
    this.bump();
    return true;
  }

  costMessage(cost: Cost): string {
    const parts = (Object.keys(cost) as ResourceKind[]).map(
      (k) => `${cost[k]} ${RESOURCES[k].name.toLocaleLowerCase('tr')}`,
    );
    return `Yetersiz kaynak: ${parts.join(' + ')}`;
  }

  affordable(cost: Cost): boolean {
    return this.canAfford(cost);
  }

  canTrainVillager(): boolean {
    const tc = this.activeBuilding('tc');
    return (
      !!tc &&
      tc.queue < TC_QUEUE_LIMIT &&
      this.villagerCount() + tc.queue < VILLAGER_LIMIT &&
      this.canAfford(VILLAGER_COST)
    );
  }

  canTrainMilitia(): boolean {
    const b = this.activeBuilding('barracks');
    return (
      this.state.age >= 1 &&
      !!b &&
      b.queue < BARRACKS_QUEUE_LIMIT &&
      this.militiaCount() + b.queue < MILITIA_LIMIT &&
      this.canAfford(MILITIA_COST)
    );
  }

  canResearchAge(): boolean {
    const s = this.state;
    if (s.research || s.age >= 2) return false;
    const target = s.age + 1;
    if (target === 2 && (!this.hasStructure('tower') || !this.hasStructure('barracks'))) return false;
    return this.canAfford(target === 1 ? AGE_II_COST : AGE_III_COST);
  }

  // ------------------------------------------------------------------- tick

  tick(dt: number): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    dt = Math.min(dt, 0.05);
    s.tick += 1;
    s.time += dt;

    for (const u of s.units) {
      if (u.flash > 0) u.flash = Math.max(0, u.flash - dt);
    }
    for (const b of s.buildings) {
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt);
    }

    this.updateRaids();

    if (this.updateResearch(dt)) return;

    for (const b of s.buildings) b.builders = 0;

    const snapshot = s.units.slice();
    for (const u of snapshot) {
      if (u.dead) continue;
      if (u.kind === 'villager') this.updateVillager(u, dt);
      else if (u.kind === 'militia') this.updateMilitia(u, dt);
      else this.updateEnemy(u, dt);
    }

    this.separate();
    this.updateBuildings(dt);
    if (s.phase !== 'playing') return;
    this.updateProjectiles(dt);

    s.units = s.units.filter((u) => !u.dead);
    const alive = new Set(s.units.map((u) => u.id));
    s.selection = s.selection.filter((id) => alive.has(id));
    if (s.selectedBuilding) {
      const b = this.building(s.selectedBuilding);
      if (!b || b.state === 'destroyed') s.selectedBuilding = null;
    }

    if (s.time >= MATCH_SECONDS) {
      this.finish(false, 'time');
    }
  }

  private updateRaids(): void {
    const s = this.state;
    const wave = WAVES[s.waveIndex];
    if (!wave) {
      s.warning = null;
      return;
    }
    const left = wave.at - s.time;
    if (left <= 0) {
      this.spawnWave(wave.side, wave.units);
      s.waveIndex += 1;
      s.warning = null;
      s.stats.raids += 1;
      this.emit({ type: 'raid', side: wave.side });
      return;
    }
    if (left <= WARNING_TIME) {
      if (!s.warning) {
        this.emit({ type: 'horn', side: wave.side });
      }
      s.warning = { side: wave.side, remaining: left, index: s.waveIndex };
    }
  }

  private spawnWave(side: Side, kinds: UnitKind[]): void {
    const s = this.state;
    const spawn = {
      west: { x: 8, y: 132 },
      east: { x: 472, y: 138 },
      north: { x: 240, y: 8 },
      south: { x: 240, y: 262 },
    }[side];
    const horizontal = side === 'north' || side === 'south';
    const n = kinds.length;
    kinds.forEach((kind, i) => {
      const offset = (i - (n - 1) / 2) * 13;
      const x = clamp(spawn.x + (horizontal ? offset : 0), 10, W - 10);
      const y = clamp(spawn.y + (horizontal ? 0 : offset), 10, H - 10);
      const u = makeUnit(kind, x, y, this.nextUnitIdNum());
      u.retarget = 0;
      s.units.push(u);
    });
  }

  private updateResearch(dt: number): boolean {
    const s = this.state;
    if (!s.research) return false;
    s.research.remaining -= dt;
    if (s.research.remaining > 0) return false;
    const target = s.research.target;
    s.research = null;
    if (target === 1) {
      s.age = 1;
      s.stats.age2Time = s.time;
      this.emit({ type: 'age', age: 1 });
      this.bump();
      return false;
    }
    s.age = 2;
    this.emit({ type: 'age', age: 2 });
    this.finish(true, 'imperial');
    return true;
  }

  private finish(win: boolean, reason: 'imperial' | 'tc' | 'time'): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    s.phase = win ? 'victory' : 'defeat';
    s.result = {
      win,
      reason,
      time: Math.min(s.time, MATCH_SECONDS),
      age2Time: s.stats.age2Time,
    };
    if (win) this.emit({ type: 'victory', time: s.result.time });
    else this.emit({ type: 'defeat', reason: reason === 'time' ? 'time' : 'tc' });
    this.onFinish?.(s);
  }

  // --------------------------------------------------------------- villagers

  private updateVillager(u: Unit, dt: number): void {
    if (u.hp <= 0) return;

    const threat = this.nearestEnemy(u.x, u.y, 58);
    if (threat) {
      u.fleeing = true;
      u.safeTimer = 0;
      const tc = this.tc();
      if (tc && tc.state !== 'destroyed') {
        const d = dist(u.x, u.y, tc.x, tc.y);
        if (d > tc.w / 2 + 8) {
          u.state = 'moving';
          this.step(u, tc.x, tc.y, dt);
          this.collide(u);
        } else {
          u.state = 'idle';
        }
      } else {
        u.state = 'idle';
      }
      return;
    }
    if (u.fleeing) {
      u.safeTimer += dt;
      if (u.safeTimer < 1.2) {
        u.state = 'idle';
        return;
      }
      u.fleeing = false;
    }

    if (u.dropoff) {
      const tc = this.tc();
      if (!tc || tc.state === 'destroyed') {
        u.state = 'idle';
        return;
      }
      const d = dist(u.x, u.y, tc.x, tc.y);
      if (d <= tc.w / 2 + 13) {
        this.deposit(u, tc);
        return;
      }
      u.state = 'moving';
      u.facing = tc.x >= u.x ? 1 : -1;
      this.step(u, tc.x, tc.y, dt);
      this.collide(u);
      return;
    }

    const order = u.order;
    if (!order) {
      if (u.carry > 0 && u.carryType) {
        u.dropoff = true;
        return;
      }
      u.state = 'idle';
      u.anim += dt * 0.5;
      return;
    }

    if (order.type === 'move') {
      const rest = this.step(u, order.x, order.y, dt);
      this.collide(u);
      u.state = rest < 2 ? 'idle' : 'moving';
      if (rest < 2) u.order = null;
      return;
    }

    if (order.type === 'build') {
      const b = this.building(order.buildingId);
      if (!b || b.state === 'destroyed' || b.state === 'active') {
        this.finishWork(u);
        return;
      }
      const spotX = b.x;
      const spotY = b.y + b.h / 2 + 9;
      const near = aabbDist(u.x, u.y, b) <= 9;
      if (near) {
        u.state = 'building';
        u.facing = b.x >= u.x ? 1 : -1;
        u.anim += dt * 2.2;
        b.builders += 1;
        u.x += (spotX >= u.x ? 1 : -1) * 2 * dt;
        return;
      }
      u.state = 'moving';
      const rest = this.step(u, spotX, spotY, dt);
      this.collide(u);
      if (rest < 2) u.state = 'building';
      return;
    }

    // gather
    const node = this.node(order.nodeId);
    if (!node || node.reserve <= 0) {
      this.finishWork(u);
      return;
    }
    u.nodeId = node.id;
    const d = dist(u.x, u.y, node.x, node.y);
    if (d <= node.radius + 6) {
      u.state = 'gathering';
      u.facing = node.x >= u.x ? 1 : -1;
      const def = GATHER[node.kind];
      const take = Math.min(def.rate * dt, node.reserve, def.capacity - u.carry);
      u.carry += take;
      u.carryType = node.kind;
      node.reserve = Math.max(0, node.reserve - take);
      u.anim += dt * 2.6;
      u.cooldown -= dt;
      if (u.cooldown <= 0) {
        u.cooldown = 0.55 + (u.idNum % 4) * 0.07;
        const ev = node.kind === 'wood' ? 'chop' : node.kind === 'gold' ? 'mine' : 'stone';
        this.emit({ type: ev, x: node.x, y: node.y });
      }
      if (u.carry >= def.capacity - 0.001 || node.reserve <= 0) {
        u.dropoff = true;
        u.carry = Math.min(u.carry, def.capacity);
      }
      return;
    }

    u.state = 'moving';
    u.facing = node.x >= u.x ? 1 : -1;
    const angle = u.idNum * 2.399963;
    const r = node.radius * 0.72;
    const tx = node.x + Math.cos(angle) * r;
    const ty = node.y + Math.sin(angle) * r * 0.72;
    this.step(u, tx, ty, dt);
    this.collide(u);
  }

  private deposit(u: Unit, tc: Building): void {
    const s = this.state;
    if (u.carry > 0 && u.carryType) {
      const amount = u.carry;
      s.resources[u.carryType] += amount;
      s.stats.gathered += amount;
      this.emit({ type: 'deposit', x: tc.x, y: tc.y - 14, resource: u.carryType, amount });
    }
    u.carry = 0;
    u.carryType = null;
    u.dropoff = false;
    u.state = 'idle';
    const order = u.order;
    if (order && order.type === 'gather') {
      const node = this.node(order.nodeId);
      if (node && node.reserve > 0) {
        u.state = 'moving';
        return;
      }
      this.finishWork(u);
      return;
    }
    if (order && order.type === 'build') {
      u.state = 'moving';
      return;
    }
    if (order && order.type === 'move') {
      u.state = 'moving';
      return;
    }
    this.finishWork(u);
  }

  private finishWork(u: Unit): void {
    const s = this.state;
    u.buildId = null;
    u.dropoff = false;
    u.state = 'idle';
    u.order = null;
    const kind = s.lastAssign;
    if (!kind) return;
    const node = this.nearestNode(kind, u.x, u.y);
    if (node) {
      u.order = { type: 'gather', nodeId: node.id };
      u.state = 'moving';
    }
  }

  // ---------------------------------------------------------------- military

  private updateMilitia(u: Unit, dt: number): void {
    const tc = this.tc();
    const nearTC = tc && tc.state !== 'destroyed' ? this.nearestEnemy(tc.x, tc.y, 150) : undefined;
    const target = this.nearestEnemy(u.x, u.y, UNIT_STATS.militia.aggro) ?? nearTC;

    if (target) {
      const reach = u.range + 4;
      const d = dist(u.x, u.y, target.x, target.y);
      if (d <= reach) {
        u.state = 'fighting';
        u.facing = target.x >= u.x ? 1 : -1;
        u.cooldown -= dt;
        if (u.cooldown <= 0) {
          u.cooldown = u.attackCd;
          u.anim += 1;
          this.damageUnit(target, u.dmg);
        }
      } else {
        u.state = 'moving';
        this.step(u, target.x, target.y, dt);
        this.collide(u);
      }
      return;
    }

    if (u.order && u.order.type === 'move') {
      const rest = this.step(u, u.order.x, u.order.y, dt);
      this.collide(u);
      u.state = rest < 2 ? 'idle' : 'moving';
      if (rest < 2) u.order = null;
      return;
    }

    const ad = dist(u.x, u.y, u.anchorX, u.anchorY);
    if (ad > 7) {
      u.state = 'moving';
      this.step(u, u.anchorX, u.anchorY, dt);
      this.collide(u);
    } else {
      u.state = 'idle';
      u.anim += dt * 0.5;
    }
  }

  private updateEnemy(u: Unit, dt: number): void {
    u.retarget -= dt;
    let target = this.resolveEnemyTarget(u);

    if (!target || u.retarget <= 0) {
      target = this.acquireEnemyTarget(u);
      u.retarget = 0.7;
    }

    if (!target) {
      const tc = this.tc();
      if (tc && tc.state !== 'destroyed') {
        u.state = 'moving';
        this.step(u, tc.x, tc.y, dt);
        this.collide(u);
      } else {
        u.state = 'idle';
      }
      return;
    }

    u.attackId = target.id;
    if ('w' in target) {
      u.attackKind = 'building';
      const reach = u.range + Math.max(target.w, target.h) / 2 - 4;
      const d = dist(u.x, u.y, target.x, target.y);
      if (d <= reach) {
        u.state = 'fighting';
        u.facing = target.x >= u.x ? 1 : -1;
        u.cooldown -= dt;
        if (u.cooldown <= 0) {
          u.cooldown = u.attackCd;
          u.anim += 1;
          this.damageBuilding(target, u.dmg);
        }
      } else {
        u.state = 'moving';
        this.step(u, target.x, target.y, dt);
        this.collide(u);
      }
      return;
    }

    u.attackKind = 'unit';
    const reach = u.range + 4;
    const d = dist(u.x, u.y, target.x, target.y);
    if (d <= reach) {
      u.state = 'fighting';
      u.facing = target.x >= u.x ? 1 : -1;
      u.cooldown -= dt;
      if (u.cooldown <= 0) {
        u.cooldown = u.attackCd;
        u.anim += 1;
        this.damageUnit(target, u.dmg);
      }
    } else {
      u.state = 'moving';
      this.step(u, target.x, target.y, dt);
      this.collide(u);
    }
  }

  private resolveEnemyTarget(u: Unit): Unit | Building | undefined {
    if (!u.attackId) return undefined;
    if (u.attackKind === 'unit') {
      const t = this.unit(u.attackId);
      if (t && isPlayerUnit(t.kind)) return t;
      return undefined;
    }
    if (u.attackKind === 'building') {
      const b = this.building(u.attackId);
      if (b && b.state !== 'destroyed') return b;
      return undefined;
    }
    return undefined;
  }

  private acquireEnemyTarget(u: Unit): Unit | Building | undefined {
    const s = this.state;
    let best: Unit | Building | undefined;
    let bestScore = Infinity;

    for (const v of s.units) {
      if (v.dead || !isPlayerUnit(v.kind)) continue;
      const weight = v.kind === 'villager' ? 0.62 : 0.9;
      const score = dist(u.x, u.y, v.x, v.y) * weight;
      if (score < bestScore) {
        bestScore = score;
        best = v;
      }
    }
    for (const b of s.buildings) {
      if (b.state === 'destroyed') continue;
      const weight = b.kind === 'tc' ? 1.18 : 1;
      const score = aabbDist(u.x, u.y, b) * weight + 12;
      if (score < bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ combat

  private damageUnit(u: Unit, amount: number): void {
    if (u.dead) return;
    const s = this.state;
    u.hp -= amount;
    u.flash = 0.16;
    this.emit({ type: 'clash', x: u.x, y: u.y - 6 });
    if (u.hp > 0) return;
    u.hp = 0;
    u.dead = true;
    u.state = 'dead';
    if (u.kind === 'villager') {
      s.stats.lostVillagers += 1;
      this.emit({ type: 'villager-death', x: u.x, y: u.y });
      return;
    }
    if (isEnemy(u.kind)) {
      const loot = UNIT_STATS[u.kind].loot;
      s.resources.gold += loot;
      s.stats.kills += 1;
      this.emit({ type: 'kill', x: u.x, y: u.y, loot });
    }
  }

  private damageBuilding(b: Building, amount: number): void {
    if (b.state === 'destroyed') return;
    b.hp -= amount;
    b.flash = 0.15;
    this.emit({ type: 'clash', x: b.x, y: b.y - 4 });
    if (b.hp > 0) return;
    b.hp = 0;
    b.state = 'destroyed';
    this.emit({ type: 'destroy', x: b.x, y: b.y });
    if (b.kind === 'tc') this.finish(false, 'tc');
  }

  private updateBuildings(dt: number): void {
    const s = this.state;
    for (const b of s.buildings) {
      if (b.state === 'destroyed') continue;
      const def = BUILDINGS[b.kind];

      if (b.state === 'building') {
        if (b.builders > 0) {
          b.progress = Math.min(1, b.progress + (dt * b.builders) / def.buildTime);
          if (b.progress >= 1) {
            b.state = 'active';
            b.progress = 1;
            b.hp = b.maxHp;
            this.emit({ type: 'build-done', x: b.x, y: b.y });
          }
        }
        continue;
      }

      if (b.kind === 'tower') {
        b.cooldown -= dt;
        if (b.cooldown <= 0) {
          const target = this.nearestEnemy(b.x, b.y, def.range ?? 0);
          if (target) {
            b.cooldown = def.attackCd ?? 0.7;
            b.targetId = target.id;
            this.launchArrow(b, target);
          }
        }
      }

      if (b.queue > 0) {
        b.trainTimer += dt;
        const time = b.kind === 'tc' ? VILLAGER_TIME : MILITIA_TIME;
        if (b.trainTimer >= time) {
          b.trainTimer -= time;
          b.queue -= 1;
          if (b.kind === 'tc') this.spawnVillager(b);
          else this.spawnMilitia(b);
        }
      }
    }

    if (s.phase !== 'playing') return;
  }

  private launchArrow(b: Building, target: Unit): void {
    const def = BUILDINGS.tower;
    const p: Projectile = {
      id: `p${this.projectileSeq++}`,
      x: b.x,
      y: b.y - 15,
      tx: target.x,
      ty: target.y - 4,
      targetId: target.id,
      speed: 210,
      dmg: def.dmg ?? 12,
      ttl: 2.4,
    };
    this.state.projectiles.push(p);
    this.emit({ type: 'arrow', x: p.x, y: p.y, tx: p.tx, ty: p.ty });
  }

  private updateProjectiles(dt: number): void {
    const s = this.state;
    for (const p of s.projectiles) {
      const target = this.unit(p.targetId);
      if (target) {
        p.tx = target.x;
        p.ty = target.y - 4;
      }
      const d = dist(p.x, p.y, p.tx, p.ty);
      if (d < 6) {
        if (target) {
          this.damageUnit(target, p.dmg);
          this.emit({ type: 'arrow-hit', x: target.x, y: target.y - 5 });
        }
        p.ttl = -1;
        continue;
      }
      const step = Math.min(d, p.speed * dt);
      p.x += ((p.tx - p.x) / d) * step;
      p.y += ((p.ty - p.y) / d) * step;
      p.ttl -= dt;
    }
    s.projectiles = s.projectiles.filter((p) => p.ttl > 0);
  }

  private spawnVillager(tc: Building): void {
    const s = this.state;
    const n = this.villagers().length;
    const angle = (n * 2.399963) % (Math.PI * 2);
    const u = makeUnit(
      'villager',
      clamp(tc.x + Math.cos(angle) * 20, 14, W - 14),
      clamp(tc.y + tc.h / 2 + 8 + Math.sin(angle) * 4, 14, H - 14),
      this.nextUnitIdNum(),
    );
    s.units.push(u);
    s.stats.trained += 1;
    if (s.lastAssign) {
      const node = this.nearestNode(s.lastAssign, u.x, u.y);
      if (node) this.sendToNode(u, node);
    }
    this.emit({ type: 'train', x: u.x, y: u.y });
  }

  private spawnMilitia(b: Building): void {
    const s = this.state;
    const tc = this.tc();
    const u = makeUnit(
      'militia',
      clamp(b.x + (this.militiaCount() % 3 - 1) * 12, 14, W - 14),
      clamp(b.y + b.h / 2 + 9, 14, H - 14),
      this.nextUnitIdNum(),
    );
    u.anchorX = tc ? tc.x + ((this.militiaCount() % 3) - 1) * 16 : b.x;
    u.anchorY = tc ? tc.y + tc.h / 2 + 18 : b.y + 24;
    s.units.push(u);
    this.emit({ type: 'militia', x: u.x, y: u.y });
  }

  // --------------------------------------------------------------- movement

  private step(u: Unit, tx: number, ty: number, dt: number): number {
    const dx = tx - u.x;
    const dy = ty - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return 0;
    const move = Math.min(d, u.speed * dt);
    u.x += (dx / d) * move;
    u.y += (dy / d) * move;
    u.x = clamp(u.x, 8, W - 8);
    u.y = clamp(u.y, 8, H - 8);
    if (Math.abs(dx) > 0.4) u.facing = dx > 0 ? 1 : -1;
    u.anim += dt;
    return Math.max(0, d - move);
  }

  private collide(u: Unit): void {
    // Player units may pass behind their own buildings. The map is tiny and
    // there is no pathfinder, so blocking them would create dead ends behind
    // the town center (e.g. a tower placed directly north).
    if (u.kind !== 'villager' && u.kind !== 'militia') {
      for (const b of this.state.buildings) {
        if (b.state === 'destroyed') continue;
        const hw = b.w / 2 + 2;
        const hh = b.h / 2 + 2;
        if (u.x > b.x - hw && u.x < b.x + hw && u.y > b.y - hh && u.y < b.y + hh) {
          const dx = u.x - b.x;
          const dy = u.y - b.y;
          const ox = hw - Math.abs(dx);
          const oy = hh - Math.abs(dy);
          if (ox < oy) u.x = b.x + (dx >= 0 ? hw : -hw);
          else u.y = b.y + (dy >= 0 ? hh : -hh);
        }
      }
    }
    u.x = clamp(u.x, 8, W - 8);
    u.y = clamp(u.y, 8, H - 8);
  }

  private separate(): void {
    const units = this.state.units;
    for (let i = 0; i < units.length; i += 1) {
      const a = units[i];
      if (!a || a.dead) continue;
      for (let j = i + 1; j < units.length; j += 1) {
        const b = units[j];
        if (!b || b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = 6.5;
        if (d > 0.001 && d < min) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push;
          a.y -= (dy / d) * push;
          b.x += (dx / d) * push;
          b.y += (dy / d) * push;
        }
      }
    }
    for (const u of units) if (!u.dead) this.collide(u);
  }

  // ------------------------------------------------------------------ tooltip

  describeAt(x: number, y: number): string {
    const pick = this.pickAt(x, y);
    if (pick.type === 'unit' && pick.id) {
      const u = this.unit(pick.id);
      if (!u) return '';
      const head = `${KIND_LABEL[u.kind]} — ${u.hp}/${u.maxHp} can`;
      const state = `Durum: ${STATE_LABEL[u.state]}`;
      if (u.kind === 'villager') {
        const carry =
          u.carry > 0.05 && u.carryType
            ? `Taşıyor: ${Math.floor(u.carry)} ${RESOURCES[u.carryType].name.toLocaleLowerCase('tr')}`
            : 'Taşıyor: —';
        return `${head}\n${state}\n${carry}`;
      }
      if (isPlayerUnit(u.kind)) return `${head}\n${state}`;
      return `${head}\n${state} · Ganimet ${UNIT_STATS[u.kind].loot} altın`;
    }
    if (pick.type === 'building' && pick.id) {
      const b = this.building(pick.id);
      if (!b) return '';
      const def = BUILDINGS[b.kind];
      let extra = `${Math.ceil(b.hp)}/${b.maxHp} can`;
      if (b.state === 'building') extra = `İnşaat %${Math.round(b.progress * 100)}`;
      else if (b.queue > 0) extra += ` · Kuyruk ${b.queue}`;
      if (b.kind === 'tower' && b.state === 'active') extra += `\nMenzil ${def.range} · ${def.dmg} hasar`;
      return `${def.name}\n${extra}`;
    }
    if (pick.type === 'node' && pick.id) {
      const n = this.node(pick.id);
      if (!n) return '';
      const working = this.villagers().filter(
        (u) => u.order?.type === 'gather' && u.order.nodeId === n.id,
      ).length;
      return `${n.name}\n${Math.ceil(n.reserve)}/${n.maxReserve} ${RESOURCES[n.kind].name.toLocaleLowerCase('tr')}\n${working} köylü çalışıyor`;
    }
    return '';
  }

  objectiveText(): string {
    const s = this.state;
    if (s.phase !== 'playing') return '';
    if (!s.stats.firstAssign) return 'Bir kaynağa tıkla — köylü işe gitsin';
    if (s.age === 0 && s.warning) return `Akın ${formatClock(s.warning.remaining)} sonra!`;
    if (s.age === 0) return `Çağ II için ${AGE_II_COST.wood} odun + ${AGE_II_COST.gold} altın`;
    if (!this.hasStructure('tower')) return 'Akınlar geliyor — okçu kulesi dik';
    if (!this.hasStructure('barracks')) return 'Kışla dik, milis bas';
    if (!s.research && s.age === 1) return 'İmparatorluk araştırmasını başlat';
    return 'İmparatorluğa ulaş';
  }

  /** Test ve ekran görüntüsü yardımcıları. */
  debugAdd(resources: Partial<Record<ResourceKind, number>>): void {
    for (const k of Object.keys(resources) as ResourceKind[]) {
      this.state.resources[k] += resources[k] ?? 0;
    }
  }

  debugPlace(kind: BuildingKind, x: number, y: number): void {
    this.state.placement = kind;
    this.tryPlace(x, y);
  }

  debugWave(side: Side, kinds: UnitKind[]): void {
    this.spawnWave(side, kinds);
  }

  debugSetTime(time: number): void {
    this.state.time = time;
  }

  debugLose(): void {
    const tc = this.tc();
    if (tc) this.damageBuilding(tc, tc.hp + 9999);
  }
}
