import type { BuildingKind, ResourceKind, Side, UnitKind } from './types';

export const W = 480;
export const H = 270;
export const MATCH_SECONDS = 180;
export const TICK = 1 / 60;

export const START_RESOURCES = { wood: 100, gold: 40, stone: 0 };
export const VILLAGER_LIMIT = 10;
export const MILITIA_LIMIT = 8;
export const TC_QUEUE_LIMIT = 5;
export const BARRACKS_QUEUE_LIMIT = 3;

export interface ResourceDef {
  name: string;
  short: string;
  color: string;
  dark: string;
}

export const RESOURCES: Record<ResourceKind, ResourceDef> = {
  wood: { name: 'Odun', short: 'ODN', color: '#d69a55', dark: '#8a5a2b' },
  gold: { name: 'Altın', short: 'ALT', color: '#f2c94c', dark: '#a87d1f' },
  stone: { name: 'Taş', short: 'TAŞ', color: '#c3c0b4', dark: '#7b796f' },
};

export const GATHER: Record<ResourceKind, { rate: number; capacity: number }> = {
  wood: { rate: 2.0, capacity: 20 },
  gold: { rate: 1.7, capacity: 20 },
  stone: { rate: 1.6, capacity: 20 },
};

export const VILLAGER_COST = { wood: 20, gold: 10 } as const;
export const VILLAGER_TIME = 5;

export const AGES = [
  { name: 'Kabile Çağı', short: 'KABİLE' },
  { name: 'Krallık Çağı', short: 'KRALLIK' },
  { name: 'İmparatorluk', short: 'İMPARATORLUK' },
] as const;

export const AGE_II_COST = { wood: 50, gold: 25 } as const;
export const AGE_II_TIME = 6;
export const AGE_III_COST = { wood: 110, gold: 75, stone: 30 } as const;
export const AGE_III_TIME = 10;

export const BUILDINGS: Record<
  BuildingKind,
  {
    name: string;
    w: number;
    h: number;
    hp: number;
    cost: Partial<Record<ResourceKind, number>>;
    buildTime: number;
    range?: number;
    dmg?: number;
    attackCd?: number;
    trainTime?: number;
  }
> = {
  tc: {
    name: 'Merkez',
    w: 46,
    h: 34,
    hp: 800,
    cost: {},
    buildTime: 0,
  },
  tower: {
    name: 'Okçu Kulesi',
    w: 18,
    h: 20,
    hp: 260,
    cost: { wood: 40, stone: 15 },
    buildTime: 6,
    range: 80,
    dmg: 14,
    attackCd: 0.65,
  },
  barracks: {
    name: 'Kışla',
    w: 34,
    h: 24,
    hp: 340,
    cost: { wood: 45, gold: 10 },
    buildTime: 6,
    trainTime: 4,
  },
};

export const MILITIA_COST = { wood: 25, gold: 8 } as const;
export const MILITIA_TIME = 4;

export const UNIT_STATS: Record<
  UnitKind,
  {
    name: string;
    hp: number;
    dmg: number;
    attackCd: number;
    speed: number;
    range: number;
    loot: number;
    aggro: number;
  }
> = {
  villager: { name: 'Köylü', hp: 45, dmg: 2, attackCd: 1.5, speed: 46, range: 11, loot: 0, aggro: 0 },
  militia: { name: 'Milis', hp: 120, dmg: 10, attackCd: 0.8, speed: 40, range: 14, loot: 0, aggro: 135 },
  raider: { name: 'Akıncı', hp: 55, dmg: 5, attackCd: 0.9, speed: 42, range: 13, loot: 3, aggro: 0 },
  warrior: { name: 'Savaşçı', hp: 90, dmg: 8, attackCd: 1, speed: 32, range: 14, loot: 5, aggro: 0 },
  chief: { name: 'Şef', hp: 240, dmg: 15, attackCd: 1.2, speed: 26, range: 16, loot: 15, aggro: 0 },
};

export const SPAWNS: Record<Side, { x: number; y: number; axis: 'x' | 'y' }> = {
  west: { x: 6, y: 132, axis: 'y' },
  east: { x: 474, y: 138, axis: 'y' },
  north: { x: 240, y: 6, axis: 'x' },
  south: { x: 240, y: 264, axis: 'x' },
};

export interface WaveDef {
  at: number;
  side: Side;
  label: string;
  units: UnitKind[];
}

export const WAVES: WaveDef[] = [
  { at: 45, side: 'west', label: 'BATI', units: ['raider', 'raider'] },
  { at: 90, side: 'east', label: 'DOĞU', units: ['raider', 'raider', 'raider', 'warrior'] },
  { at: 135, side: 'north', label: 'KUZEY', units: ['warrior', 'warrior', 'warrior', 'warrior', 'chief'] },
  { at: 165, side: 'south', label: 'GÜNEY', units: ['raider', 'raider', 'warrior', 'warrior', 'chief'] },
];

export const WARNING_TIME = 3;

export const MAP_MARGIN = 10;

export const COLORS = {
  grass: '#5d6b3a',
  grassDark: '#4b5a2d',
  grassLight: '#6d7c46',
  grassDeep: '#3c4b25',
  dirt: '#7b6644',
  dirtDark: '#5f4e32',
  leaf: '#2f5730',
  leafLight: '#447a3c',
  leafDark: '#203f22',
  trunk: '#5b3e25',
  wood: '#a9743f',
  woodDark: '#7c512c',
  woodLight: '#c99358',
  stone: '#8d9089',
  stoneDark: '#666b63',
  stoneLight: '#b3b6ad',
  gold: '#f2c94c',
  goldDark: '#a87d1f',
  skin: '#e8b98a',
  skinDark: '#bd8b61',
  blue: '#4a7fa8',
  blueDark: '#2f5778',
  red: '#b3463d',
  redDark: '#7c2c27',
  steel: '#a9b1b7',
  steelDark: '#6b7479',
  white: '#f4f1e6',
  ink: '#191b13',
  fog: '#0b0d08',
};

export const UNIT_COLORS: Record<UnitKind, { cloth: string; clothDark: string; trim: string }> = {
  villager: { cloth: '#4a7fa8', clothDark: '#2f5778', trim: '#d8c9a3' },
  militia: { cloth: '#5b7f64', clothDark: '#3b5843', trim: '#c7d0d4' },
  raider: { cloth: '#9c4a3a', clothDark: '#6e3026', trim: '#d8b37a' },
  warrior: { cloth: '#7c3a33', clothDark: '#542520', trim: '#b9a37c' },
  chief: { cloth: '#4a2f2a', clothDark: '#2f1d1a', trim: '#d4b45e' },
};
