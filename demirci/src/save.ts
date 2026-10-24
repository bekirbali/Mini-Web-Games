const KEY = 'lanetli-demirci.meta.v1';

export interface Meta {
  best: number;
  runs: number;
  bestBlade: number;
}

const DEFAULT: Meta = { best: 0, runs: 0, bestBlade: 0 };

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Meta>;
    return {
      best: Number(parsed.best) || 0,
      runs: Number(parsed.runs) || 0,
      bestBlade: Number(parsed.bestBlade) || 0,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveMeta(meta: Meta): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* depolama kapalıysa sessizce geç */
  }
}
