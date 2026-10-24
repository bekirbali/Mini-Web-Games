export type Phase =
  | 'title'
  | 'dayIntro'
  | 'arrive'
  | 'stance'
  | 'strike'
  | 'result'
  | 'rescue'
  | 'shop'
  | 'ownForgeIntro'
  | 'auction'
  | 'ended';

export type StanceId = 'careful' | 'normal' | 'bold';

export interface StanceDef {
  id: StanceId;
  name: string;
  key: string;
  zoneMul: number;
  goodMul: number;
  payMul: number;
  repMul: number;
  desc: string;
}

export type ItemKind = 'sword' | 'axe' | 'dagger' | 'armor' | 'shield';

export type SpecialId = 'blind' | 'noble' | 'shaky' | 'humble';

export interface SpecialDef {
  id: SpecialId;
  name: string;
  desc: string;
}

export interface Customer {
  name: string;
  title: string;
  kind: ItemKind;
  itemName: string;
  target: number;
  payMul: number;
  repMul: number;
  special: SpecialId | null;
  line: string;
}

export interface ForgeItem {
  name: string;
  kind: ItemKind;
  tier: number;
  target: number;
  durability: number;
  maxDurability: number;
  own: boolean;
  perfects: number;
}

export type StrikeKind = 'perfect' | 'good' | 'miss' | 'burn';

export interface StrikeResult {
  kind: StrikeKind;
  pos: number;
  damage: number;
}

export interface UpgradeCard {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export interface Bidder {
  name: string;
  budget: number;
  persona: string;
  alive: boolean;
}

export interface AuctionState {
  bidders: Bidder[];
  price: number;
  round: number;
  base: number;
  revenue: number;
  sold: boolean;
  failed: boolean;
  lastRaise: number;
}

export interface Stats {
  strikes: number;
  perfects: number;
  misses: number;
  burns: number;
  delivered: number;
  orderGold: number;
  rejected: number;
}

export interface GameState {
  phase: Phase;
  day: number;
  gold: number;
  reputation: number;
  maxReputation: number;

  customerIndex: number;
  customer: Customer | null;
  item: ForgeItem | null;

  stance: StanceId;
  zoneW: number;
  barSpeed: number;
  barStart: number;

  result: StrikeResult | null;
  pendingDamage: number;
  phaseUntil: number;

  upgrades: { anvil: number; bellows: number; counter: number };
  scrolls: number;
  steelCharges: number;
  candleCharges: number;

  shopOptions: UpgradeCard[];
  auction: AuctionState | null;

  stats: Stats;
  message: string;
  messageTone: 'good' | 'bad' | 'neutral';
  banner: string;
  endReason: string;
  score: number;
}

export type Emit = (state: GameState) => void;
