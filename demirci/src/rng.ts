export class Rng {
  private s: number;

  constructor(seed = Date.now() >>> 0) {
    this.s = seed >>> 0;
  }

  next(): number {
    // mulberry32
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  weighted<T extends { weight: number }>(arr: readonly T[]): T {
    const total = arr.reduce((a, b) => a + b.weight, 0);
    let r = this.next() * total;
    for (const item of arr) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return arr[arr.length - 1]!;
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
