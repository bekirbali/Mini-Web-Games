import type { ItemKind, SpecialDef, StanceDef, UpgradeCard } from './types';

export const CONFIG = {
  days: 3,
  customersPerDay: 6,
  startGold: 80,
  startReputation: 3,
  maxReputation: 5,
  materialCost: 8,
  commissionBase: 10,
  commissionGrowth: 1.35,
  perfectBonus: 0.25,
  deliverReputation: 0.35,
  perfectReputation: 0.12,
  rejectReputation: 0.2,
  burnReputation: 1.1,
  burnDurability: 1,
  burnDurabilityHigh: 2,
  resultDelayMs: 950,
  rescueMs: 3400,
  shopBaseCost: 120,
  shopStepCost: 60,
  anvilZoneBonus: 0.18,
  bellowsSpeedBonus: 0.1,
  counterPayBonus: 0.2,
} as const;

/** tier 1..9 → isabet bölgesi (bar genişliğinin oranı) */
export const TIER_ZONE = [0.145, 0.13, 0.115, 0.095, 0.082, 0.072, 0.058, 0.048, 0.04];

/** tier 1..9 → saniyedeki tur sayısı */
export const TIER_SPEED = [1.0, 1.05, 1.12, 1.3, 1.45, 1.6, 1.9, 2.1, 2.35];

export const STANCES: StanceDef[] = [
  {
    id: 'careful',
    name: 'Temkinli',
    key: '1',
    zoneMul: 1.6,
    goodMul: 2.2,
    payMul: 0.7,
    repMul: 0.5,
    desc: 'Geniş bölge · az para · az risk',
  },
  {
    id: 'normal',
    name: 'Normal',
    key: '2',
    zoneMul: 1,
    goodMul: 1.6,
    payMul: 1,
    repMul: 1,
    desc: 'Dengeli',
  },
  {
    id: 'bold',
    name: 'Cüretkâr',
    key: '3',
    zoneMul: 0.55,
    goodMul: 1,
    payMul: 2,
    repMul: 2,
    desc: 'Sadece mükemmel sayılır · 2× para · +5 öncesi kilitli',
  },
];

export const STANCE_MAP: Record<string, StanceDef> = Object.fromEntries(
  STANCES.map((s) => [s.id, s]),
);

export const ITEMS: Record<
  ItemKind,
  { label: string; zoneMul: number; speedMul: number; payMul: number; durability: number }
> = {
  sword: { label: 'Kılıç', zoneMul: 1, speedMul: 1, payMul: 1, durability: 3 },
  axe: { label: 'Balta', zoneMul: 0.9, speedMul: 1, payMul: 1.15, durability: 3 },
  dagger: { label: 'Hançer', zoneMul: 1, speedMul: 1.1, payMul: 0.95, durability: 2 },
  armor: { label: 'Zırh', zoneMul: 1.18, speedMul: 0.95, payMul: 1.1, durability: 4 },
  shield: { label: 'Kalkan', zoneMul: 1.08, speedMul: 0.92, payMul: 1, durability: 4 },
};

export const ITEM_KINDS: ItemKind[] = ['sword', 'axe', 'dagger', 'armor', 'shield'];

export const ITEM_NAMES: Record<ItemKind, string[]> = {
  sword: ['Paslı Kılıç', 'Demir Kılıç', 'Süvari Kılıcı', 'Çift Ağızlı Kılıç'],
  axe: ['Oduncu Baltası', 'Savaş Baltası', 'Çift Taraflı Balta', 'Cellat Baltası'],
  dagger: ['Aşçı Hançeri', 'Suikast Hançeri', 'Zehirli Hançer'],
  armor: ['Deri Yelek', 'Zincir Zırh', 'Plaka Zırh', 'Şövalye Zırhı'],
  shield: ['Tahta Kalkan', 'Demir Kalkan', 'Kule Kalkanı'],
};

export const ARCHETYPES = [
  { label: 'Köylü', pay: 0.9, weight: 28 },
  { label: 'Maceracı', pay: 1.0, weight: 32 },
  { label: 'Şövalye', pay: 1.3, weight: 22 },
  { label: 'Soylu', pay: 1.7, weight: 13 },
  { label: 'Kraliyet', pay: 2.2, weight: 5 },
];

export const TITLES: Record<string, string[]> = {
  Köylü: ['Değirmenci', 'Çiftçi', 'Oduncu', 'Balıkçı', 'Çoban'],
  Maceracı: ['Gezgin', 'Paralı Asker', 'Define Avcısı', 'Kervan Bekçisi'],
  Şövalye: ['Muhafız', 'Süvari', 'Kule Bekçisi', 'Sancaktar'],
  Soylu: ['Kont', 'Vikont', 'Tüccar Beyi', 'Toprak Ağası'],
  Kraliyet: ['Saray Demircibaşısı', "Kralın Uşağı", 'Muhafız Komutanı'],
};

export const NAMES = [
  'Durmuş', 'Sıtkı', 'Nuriye', 'Gülbeyaz', 'Karaoğlan', 'Şirin', 'Halil',
  'Münevver', 'Rıza', 'Zeliha', 'Bekir', 'Nazmiye', 'Temel', 'Fadime',
  'Cemşit', 'Perihan', 'Kadir', 'Sabriye', 'Necmi', 'Hüsnü', 'Ayten',
  'Şevket', 'Muammer', 'Zekiye', 'Hasan', 'Döndü', 'İsmail', 'Saniye',
];

export const SPECIALS: SpecialDef[] = [
  { id: 'blind', name: 'Gözü Kapalı', desc: 'İsabet bölgesi görünmüyor. Hisset.' },
  { id: 'noble', name: 'Soylu Sipariş', desc: 'Ödeme ×1.6 · yanmada itibar cezası ×1.5' },
  { id: 'shaky', name: 'Sabırsız Müşteri', desc: 'Bar %15 daha hızlı' },
  { id: 'humble', name: 'Fakir ama Minnettar', desc: 'Ödeme ×0.7 · teslimde ekstra itibar' },
];

export const UPGRADES: UpgradeCard[] = [
  { id: 'anvil', name: 'Ağır Örs', desc: 'İsabet bölgesi kalıcı olarak +%18 genişler', icon: '⚒' },
  { id: 'bellows', name: 'Usta Körük', desc: 'Bar kalıcı olarak %10 yavaşlar', icon: '≈' },
  { id: 'counter', name: 'Pirinç Tezgâh', desc: 'Tüm komisyonlar +%20', icon: '◈' },
  { id: 'scrolls', name: 'Parşömen Sandığı', desc: '+2 kutsama parşömeni', icon: '✧' },
  { id: 'steel', name: 'Çelik Suyu', desc: 'Sonraki 2 eşyada +1 dayanıklılık', icon: '❖' },
  { id: 'candle', name: 'Şans Mumu', desc: 'Sonraki 1 ıskayı affeder', icon: '✶' },
];

export const AUCTION_NAMES = [
  'Tüccar Feyyaz', 'Koleksiyoncu Melis', 'Emekli General Rauf',
  'Lord Vardar', 'Simyacı Nihat', 'Hanımefendi Sırma',
];

export const BIDDER_PERSONAS = [
  { label: 'agresif', raise: 1.24, budget: 1.15 },
  { label: 'sabırlı', raise: 1.14, budget: 1.35 },
  { label: 'cimri', raise: 1.08, budget: 0.85 },
];
