import {
  ARCHETYPES,
  AUCTION_NAMES,
  BIDDER_PERSONAS,
  CONFIG,
  ITEMS,
  ITEM_KINDS,
  ITEM_NAMES,
  NAMES,
  SPECIALS,
  STANCE_MAP,
  TIER_SPEED,
  TIER_ZONE,
  TITLES,
  UPGRADES,
} from './config';
import { Rng, clamp } from './rng';
import { loadMeta, saveMeta } from './save';
import type {
  AuctionState,
  Bidder,
  Customer,
  Emit,
  ForgeItem,
  GameState,
  ItemKind,
  SpecialId,
  Stats,
  StrikeResult,
  UpgradeCard,
} from './types';

export type GameEvent =
  | 'perfect'
  | 'good'
  | 'miss'
  | 'burn'
  | 'deliver'
  | 'coin'
  | 'click'
  | 'day'
  | 'heartbeat'
  | 'heartbeat-stop'
  | 'auction-sold'
  | 'auction-failed'
  | 'rep-low';

const now = () => performance.now();

export function barPosition(start: number, speed: number, t: number): number {
  const cycle = ((t - start) / 1000) * speed;
  const x = cycle - Math.floor(cycle);
  return x < 0.5 ? x * 2 : 2 - x * 2;
}

function createStats(): Stats {
  return {
    strikes: 0,
    perfects: 0,
    misses: 0,
    burns: 0,
    delivered: 0,
    orderGold: 0,
    rejected: 0,
  };
}

export class Game {
  state: GameState;
  onChange: Emit | null = null;
  onEvent: ((e: GameEvent) => void) | null = null;

  private rng = new Rng();
  private meta = loadMeta();
  private pending: 'strike' | 'deliver' | 'burn' | 'auction' | null = null;

  constructor() {
    this.state = this.freshState();
  }

  /* ---------------------------------------------------------------- setup */

  private freshState(): GameState {
    return {
      phase: 'title',
      day: 1,
      gold: CONFIG.startGold,
      reputation: CONFIG.startReputation,
      maxReputation: CONFIG.maxReputation,
      customerIndex: 0,
      customer: null,
      item: null,
      stance: 'normal',
      zoneW: 0.1,
      barSpeed: 1.2,
      barStart: 0,
      result: null,
      pendingDamage: 0,
      phaseUntil: 0,
      upgrades: { anvil: 0, bellows: 0, counter: 0 },
      scrolls: 1,
      steelCharges: 0,
      candleCharges: 0,
      shopOptions: [],
      auction: null,
      stats: createStats(),
      message: '',
      messageTone: 'neutral',
      banner: '',
      endReason: '',
      score: 0,
    };
  }

  private emit(): void {
    this.onChange?.(this.state);
  }

  private fire(e: GameEvent): void {
    this.onEvent?.(e);
  }

  start(): void {
    this.rng = new Rng(Date.now() >>> 0);
    this.pending = null;
    this.state = this.freshState();
    this.beginDay();
  }

  restart(): void {
    this.start();
  }

  /* ----------------------------------------------------------------- days */

  private beginDay(): void {
    const s = this.state;
    s.phase = 'dayIntro';
    s.banner = `GÜN ${s.day}`;
    s.customerIndex = 0;
    s.customer = null;
    s.item = null;
    s.result = null;
    s.message = '';
    this.fire('day');
    this.emit();
  }

  openShop(): void {
    const s = this.state;
    s.phase = 'arrive';
    s.customerIndex = 0;
    this.spawnCustomer();
    this.emit();
  }

  private spawnCustomer(): void {
    const s = this.state;
    s.phase = 'arrive';
    s.result = null;
    s.customer = this.makeCustomer(s.day);
    s.item = this.makeItem(
      s.customer.kind,
      0,
      s.customer.target,
      s.customer.itemName,
      false,
    );
    s.stance = 'normal';
    s.message = '';
    s.messageTone = 'neutral';
    this.computeBar();
  }

  private makeCustomer(day: number): Customer {
    const rng = this.rng;
    const arche = rng.weighted(ARCHETYPES);
    const kind = rng.pick(ITEM_KINDS);
    const ranges: [number, number][] = [
      [1, 3],
      [3, 6],
      [4, 8],
    ];
    const [lo, hi] = ranges[clamp(day, 1, 3) - 1]!;
    const spike = rng.next() < 0.18 ? 1 : 0;
    const target = clamp(rng.int(lo, hi) + spike, 1, 9);

    let special: SpecialId | null = null;
    let payMul = arche.pay * ITEMS[kind].payMul;
    let repMul = 1;

    if (rng.next() < 0.3) {
      special = rng.pick(SPECIALS).id;
      if (special === 'noble') {
        payMul *= 1.6;
        repMul = 1.5;
      } else if (special === 'humble') {
        payMul *= 0.7;
      }
    }

    const baseName = rng.pick(NAMES);
    const title = rng.pick(TITLES[arche.label] ?? ['Yolcu']);
    const itemName = rng.pick(ITEM_NAMES[kind]);

    return {
      name: baseName,
      title,
      kind,
      itemName,
      target,
      payMul,
      repMul,
      special,
      line: this.customerLine(baseName, itemName, target, special),
    };
  }

  private customerLine(name: string, item: string, target: number, special: SpecialId | null): string {
    const sp = special ? SPECIALS.find((x) => x.id === special) : null;
    const base = [
      `"${name} ben. Şu ${item.toLowerCase()} +${target} olsun, elim yanar da dükkâna gelirsem!"`,
      `"Usta, ${item.toLowerCase()} +${target}. Ama dikkat et, dedemindi."`,
      `"${item} +${target}. Parayı peşin veriyorum, umarım pişman olmam."`,
      `"Kervan yarın yola çıkıyor. ${item} +${target} olmalı. Acele."`,
    ];
    const line = this.rng.pick(base);
    return sp ? `${line}\n(${sp.name}: ${sp.desc})` : line;
  }

  private makeItem(
    kind: ItemKind,
    tier: number,
    target: number,
    name: string,
    own: boolean,
  ): ForgeItem {
    const s = this.state;
    let dur = ITEMS[kind].durability;
    if (s.steelCharges > 0) {
      dur += 1;
      s.steelCharges -= 1;
    }
    return {
      name,
      kind,
      tier,
      target,
      durability: dur,
      maxDurability: dur,
      own,
      perfects: 0,
    };
  }

  /* -------------------------------------------------------------- customer */

  accept(): void {
    const s = this.state;
    if (s.phase !== 'arrive') return;
    s.phase = 'stance';
    s.stance = 'normal';
    this.computeBar();
    this.fire('click');
    this.emit();
  }

  reject(): void {
    const s = this.state;
    if (s.phase !== 'arrive') return;
    s.stats.rejected += 1;
    this.changeRep(-CONFIG.rejectReputation);
    this.nextCustomer();
  }

  private nextCustomer(): void {
    const s = this.state;
    s.customerIndex += 1;
    if (this.checkReputation()) return;
    if (s.customerIndex >= CONFIG.customersPerDay) {
      this.endOfDay();
      return;
    }
    this.spawnCustomer();
    this.emit();
  }

  /* ----------------------------------------------------------------- forge */

  private computeBar(): void {
    const s = this.state;
    const item = s.item;
    if (!item) return;
    const tierIdx = clamp(item.tier, 1, 9) - 1;
    let zone = TIER_ZONE[tierIdx]! * ITEMS[item.kind].zoneMul;
    zone *= STANCE_MAP[s.stance]!.zoneMul;
    zone *= 1 + CONFIG.anvilZoneBonus * s.upgrades.anvil;
    s.zoneW = clamp(zone, 0.025, 0.5);

    let speed = TIER_SPEED[tierIdx]! * ITEMS[item.kind].speedMul;
    speed *= Math.pow(1 - CONFIG.bellowsSpeedBonus, s.upgrades.bellows);
    if (s.customer?.special === 'shaky') speed *= 1.15;
    s.barSpeed = speed;
  }

  canUseStance(id: string): boolean {
    if (id === 'bold') return (this.state.item?.tier ?? 0) >= 4;
    return true;
  }

  chooseStance(id: string): void {
    const s = this.state;
    if (s.phase !== 'stance') return;
    const stance = STANCE_MAP[id];
    if (!stance) return;
    if (!this.canUseStance(id)) return;
    s.stance = stance.id;
    this.computeBar();
    s.barStart = now();
    s.phase = 'strike';
    s.result = null;
    s.message = '';
    this.fire('click');
    this.emit();
  }

  private strikePay(): number {
    return this.payFor(this.state.stance);
  }

  payFor(stanceId: string): number {
    const s = this.state;
    const item = s.item;
    if (!item || item.own) return 0;
    const base = CONFIG.commissionBase * Math.pow(CONFIG.commissionGrowth, item.tier - 1);
    const stance = STANCE_MAP[stanceId] ?? STANCE_MAP.normal!;
    const counter = 1 + CONFIG.counterPayBonus * s.upgrades.counter;
    return Math.round(base * (s.customer?.payMul ?? 1) * stance.payMul * counter);
  }

  strike(at: number): StrikeResult | null {
    const s = this.state;
    const item = s.item;
    if (s.phase !== 'strike' || !item) return null;

    const pos = barPosition(s.barStart, s.barSpeed, at);
    const dist = Math.abs(pos - 0.5);
    const half = s.zoneW / 2;
    const goodMul = STANCE_MAP[s.stance]!.goodMul;

    s.stats.strikes += 1;
    s.gold = Math.max(0, s.gold - CONFIG.materialCost);

    let kind: StrikeResult['kind'];
    if (dist <= half) kind = 'perfect';
    else if (dist <= half * goodMul) kind = 'good';
    else kind = 'miss';

    let damage = 0;

    if (kind === 'miss') {
      s.stats.misses += 1;
      damage = item.tier >= 7 || s.stance === 'bold' ? CONFIG.burnDurabilityHigh : CONFIG.burnDurability;
      if (s.candleCharges > 0) {
        s.candleCharges -= 1;
        damage = 0;
        s.message = 'Şans mumu seni kurtardı.';
        s.messageTone = 'neutral';
      } else {
        s.message = 'Iskaladın!';
        s.messageTone = 'bad';
      }
    } else {
      const pay = item.own ? 0 : this.strikePay();
      item.tier += 1;
      if (kind === 'perfect') {
        item.perfects += 1;
        s.stats.perfects += 1;
        if (item.own) {
          s.message = 'MÜKEMMEL! Kılıç parladı.';
        } else {
          const gain = Math.round(pay * (1 + CONFIG.perfectBonus));
          s.gold += gain;
          this.addOrderGold(gain);
          this.changeRep(CONFIG.perfectReputation);
          s.message = `MÜKEMMEL! +${gain} altın`;
        }
        s.messageTone = 'good';
        this.fire('perfect');
      } else {
        if (item.own) {
          s.message = `Sağlam vuruş. +${item.tier} oldu.`;
        } else {
          s.gold += pay;
          this.addOrderGold(pay);
          s.message = `Sağlam vuruş. +${pay} altın`;
        }
        s.messageTone = 'good';
        this.fire('good');
      }
    }

    const result: StrikeResult = { kind, pos, damage };
    s.result = result;
    s.phase = 'result';
    s.phaseUntil = now() + CONFIG.resultDelayMs;

    if (kind === 'miss') {
      this.fire('miss');
      const wouldBurn = item.durability - damage <= 0;
      if (wouldBurn && damage > 0) {
        s.pendingDamage = damage;
        s.phase = 'rescue';
        s.phaseUntil = now() + CONFIG.rescueMs;
        s.message = 'Eşya yanmak üzere!';
        s.messageTone = 'bad';
        this.emit();
        return result;
      }
      item.durability = Math.max(0, item.durability - damage);
      if (damage > 0) {
        s.message = `Iskaladın! Dayanıklılık -${damage}`;
        s.messageTone = 'bad';
      }
      this.pending = 'strike';
    } else if (item.tier >= item.target) {
      this.pending = item.own ? 'auction' : 'deliver';
    } else {
      this.pending = 'strike';
    }

    this.emit();
    return result;
  }

  private addOrderGold(v: number): void {
    this.state.stats.orderGold += v;
  }

  resolveRescue(choice: 'scroll' | 'anvil' | 'none'): void {
    const s = this.state;
    const item = s.item;
    if (s.phase !== 'rescue' || !item) return;

    if (choice === 'scroll' && s.scrolls > 0) {
      s.scrolls -= 1;
      s.message = 'Parşömen tutuştu, eşya kurtuldu.';
      s.messageTone = 'good';
      this.fire('good');
    } else if (choice === 'anvil' && s.upgrades.anvil > 0) {
      s.upgrades.anvil -= 1;
      s.message = 'Örs çatladı ama eşya kurtuldu.';
      s.messageTone = 'neutral';
      this.fire('good');
    } else if (choice === 'none') {
      item.durability = 0;
      this.burnItem();
      return;
    } else {
      // geçersiz seçim (kaynak yok) — pencere açık kalsın
      return;
    }

    s.result = { kind: 'miss', pos: s.result?.pos ?? 0.5, damage: 0 };
    s.phase = 'result';
    s.phaseUntil = now() + CONFIG.resultDelayMs;
    this.pending = 'strike';
    this.emit();
  }

  private burnItem(): void {
    const s = this.state;
    const item = s.item;
    if (!item) return;
    s.stats.burns += 1;
    const repLoss = CONFIG.burnReputation * (s.customer?.repMul ?? 1) * STANCE_MAP[s.stance]!.repMul;
    this.changeRep(-repLoss);
    s.message = item.own
      ? 'Kendi kılıcın kül oldu. Bu acıyı biliyorsun.'
      : 'EŞYA YANDI. Müşteri dükkânı taşlıyor.';
    s.messageTone = 'bad';
    s.result = { kind: 'burn', pos: s.result?.pos ?? 0.5, damage: 0 };
    s.phase = 'result';
    s.phaseUntil = now() + CONFIG.resultDelayMs + 500;
    this.pending = 'burn';
    this.fire('burn');
    this.emit();
  }

  private deliver(): void {
    const s = this.state;
    const item = s.item;
    if (!item) return;
    const bonus = Math.round(item.target * 5 * (s.customer?.payMul ?? 1));
    const repGain = CONFIG.deliverReputation * (s.customer?.special === 'humble' ? 1.8 : 1);
    s.gold += bonus;
    this.addOrderGold(bonus);
    s.stats.delivered += 1;
    this.changeRep(repGain);
    s.message = `Teslim edildi! +${bonus} altın bahşiş.`;
    s.messageTone = 'good';
    this.fire('deliver');
  }

  tick(t: number): void {
    const s = this.state;
    if (s.phase === 'result' && t >= s.phaseUntil) {
      this.afterResult();
    } else if (s.phase === 'rescue' && t >= s.phaseUntil) {
      this.resolveRescue('none');
    }
  }

  private afterResult(): void {
    const s = this.state;
    const action = this.pending;
    this.pending = null;
    // setTimeout ile ilerleyen akışlarda tick'in tekrar tetiklenmesini engelle
    s.phaseUntil = Number.POSITIVE_INFINITY;

    if (action === 'deliver') {
      this.deliver();
      this.emit();
      window.setTimeout(() => this.nextCustomer(), 700);
      return;
    }
    if (action === 'burn') {
      this.emit();
      window.setTimeout(() => {
        if (s.item?.own) {
          this.endRun('Kendi kılıcın yandı. Müzayede iptal.');
        } else {
          this.nextCustomer();
        }
      }, 900);
      return;
    }
    if (action === 'auction') {
      this.startAuction();
      return;
    }
    // 'strike' veya null
    s.phase = 'stance';
    s.result = null;
    this.computeBar();
    this.emit();
  }

  /* ------------------------------------------------------------------ shop */

  private endOfDay(): void {
    const s = this.state;
    if (s.day >= CONFIG.days) {
      s.phase = 'ownForgeIntro';
      s.message = '';
      this.emit();
      return;
    }
    const pool = [...UPGRADES];
    const picked: UpgradeCard[] = [];
    while (picked.length < 3 && pool.length > 0) {
      const i = this.rng.int(0, pool.length - 1);
      picked.push(pool.splice(i, 1)[0]!);
    }
    s.shopOptions = picked;
    s.phase = 'shop';
    this.emit();
  }

  pickUpgrade(id: string): void {
    const s = this.state;
    if (s.phase !== 'shop') return;
    if (!s.shopOptions.some((o) => o.id === id)) return;
    if (s.gold < this.shopCost()) return;
    s.gold -= this.shopCost();
    switch (id) {
      case 'anvil':
        s.upgrades.anvil += 1;
        break;
      case 'bellows':
        s.upgrades.bellows += 1;
        break;
      case 'counter':
        s.upgrades.counter += 1;
        break;
      case 'scrolls':
        s.scrolls += 2;
        break;
      case 'steel':
        s.steelCharges += 2;
        break;
      case 'candle':
        s.candleCharges += 1;
        break;
      default:
        break;
    }
    s.shopOptions = [];
    this.advanceDay();
  }

  shopCost(): number {
    return Math.round(CONFIG.shopBaseCost + CONFIG.shopStepCost * (this.state.day - 1));
  }

  skipShop(): void {
    if (this.state.phase !== 'shop') return;
    this.advanceDay();
  }

  private advanceDay(): void {
    const s = this.state;
    s.day += 1;
    s.phase = 'dayIntro';
    s.banner = `GÜN ${s.day}`;
    s.customerIndex = 0;
    s.customer = null;
    s.item = null;
    s.result = null;
    s.message = '';
    s.messageTone = 'neutral';
    this.fire('day');
    this.emit();
  }

  /* ------------------------------------------------------------ own blade */

  startOwnForge(): void {
    const s = this.state;
    if (s.phase !== 'ownForgeIntro') return;
    const kind = this.rng.pick(ITEM_KINDS);
    const ownNames: Record<ItemKind, string> = {
      sword: 'Kendi Kılıcın',
      axe: 'Kendi Baltan',
      dagger: 'Kendi Hançerin',
      armor: 'Kendi Zırhın',
      shield: 'Kendi Kalkanın',
    };
    s.item = this.makeItem(kind, 4, 9, ownNames[kind], true);
    s.customer = null;
    s.phase = 'stance';
    s.stance = 'normal';
    s.result = null;
    s.message = 'Bu sefer müşteri yok. Risk tamamen senin.';
    s.messageTone = 'neutral';
    this.computeBar();
    this.emit();
  }

  /* -------------------------------------------------------------- auction */

  private startAuction(): void {
    const s = this.state;
    const item = s.item;
    if (!item) return;
    const base = Math.round(320 + item.perfects * 45 + (item.tier - 5) * 90);

    const names = [...AUCTION_NAMES];
    const bidders: Bidder[] = [];
    for (let i = 0; i < 3; i += 1) {
      const persona = this.rng.pick(BIDDER_PERSONAS);
      const nameIdx = this.rng.int(0, names.length - 1);
      const name = names.splice(nameIdx, 1)[0] ?? 'Alıcı';
      bidders.push({
        name,
        persona: persona.label,
        budget: Math.round(base * persona.budget * this.rng.range(0.82, 1.22)),
        alive: true,
      });
    }

    const auction: AuctionState = {
      bidders,
      price: Math.round(base * 0.35),
      round: 1,
      base,
      revenue: 0,
      sold: false,
      failed: false,
      lastRaise: 0,
    };

    s.auction = auction;
    s.phase = 'auction';
    s.result = null;
    s.message = 'Müzayede başladı. Ne kadar aç gözlüsün?';
    s.messageTone = 'neutral';
    this.emit();
  }

  auctionSell(): void {
    const s = this.state;
    const a = s.auction;
    if (s.phase !== 'auction' || !a || a.sold || a.failed) return;
    a.sold = true;
    a.revenue = a.price;
    s.gold += a.price;
    this.fire('auction-sold');
    this.finishRun(`Kılıcın ${a.price} altına satıldı.`);
  }

  auctionContinue(): void {
    const s = this.state;
    const a = s.auction;
    if (s.phase !== 'auction' || !a || a.sold || a.failed) return;

    const raise = this.rng.range(1.1, 1.24);
    const nextPrice = Math.round(a.price * raise);
    a.lastRaise = Math.round((raise - 1) * 100);
    a.price = nextPrice;
    a.round += 1;

    for (const b of a.bidders) {
      if (b.alive && b.budget < nextPrice) b.alive = false;
    }

    const alive = a.bidders.filter((b) => b.alive);
    if (alive.length === 0) {
      a.failed = true;
      a.revenue = Math.round(a.base * 0.15);
      s.gold += a.revenue;
      this.fire('auction-failed');
      this.finishRun('Alıcılar kaçtı. Kılıcı hurdacıya sattın.');
      return;
    }
    this.fire('click');
    this.emit();
  }

  /* ------------------------------------------------------------------ end */

  private checkReputation(): boolean {
    const s = this.state;
    if (s.reputation <= 0) {
      s.reputation = 0;
      this.endRun('İtibarın bitti. Dükkân taşlandı, kepenk indi.');
      return true;
    }
    return false;
  }

  private changeRep(v: number): void {
    const s = this.state;
    s.reputation = clamp(s.reputation + v, 0, s.maxReputation);
    if (s.reputation <= 1) this.fire('rep-low');
  }

  finishRun(reason: string): void {
    const s = this.state;
    s.score = Math.round(s.gold);
    s.endReason = reason;
    s.phase = 'ended';
    const meta = this.meta;
    meta.runs += 1;
    if (s.score > meta.best) meta.best = s.score;
    const bladeTier = s.item?.own ? s.item.tier : 0;
    if (bladeTier > meta.bestBlade) meta.bestBlade = bladeTier;
    saveMeta(meta);
    this.emit();
  }

  private endRun(reason: string): void {
    this.finishRun(reason);
  }

  getMeta() {
    return this.meta;
  }
}
