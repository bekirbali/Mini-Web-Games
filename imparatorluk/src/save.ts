import type { BoardEntry, Meta, RunRecord } from './types';

const KEY = 'imparatorluk.meta.v1';

export function defaultMeta(): Meta {
  return {
    name: 'Komutan',
    muted: false,
    plays: 0,
    board: [],
    best: null,
    tutorialSeen: false,
  };
}

export function sanitizeName(raw: string): string {
  const clean = raw.replace(/[^\p{L}\p{N} _.-]/gu, '').trim();
  return clean.slice(0, 12) || 'Komutan';
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as Partial<Meta>;
    const board = Array.isArray(parsed.board)
      ? parsed.board
          .filter(
            (e): e is BoardEntry =>
              !!e &&
              typeof e.time === 'number' &&
              Number.isFinite(e.time) &&
              typeof e.name === 'string',
          )
          .map((e) => ({
            name: sanitizeName(e.name),
            time: Math.max(0, Math.min(999, e.time)),
            age2: typeof e.age2 === 'number' ? e.age2 : null,
            kills: typeof e.kills === 'number' ? e.kills : 0,
            date: typeof e.date === 'number' ? e.date : Date.now(),
          }))
          .sort((a, b) => a.time - b.time)
          .slice(0, 10)
      : [];
    return {
      name: sanitizeName(typeof parsed.name === 'string' ? parsed.name : 'Komutan'),
      muted: !!parsed.muted,
      plays: typeof parsed.plays === 'number' ? parsed.plays : 0,
      board,
      best:
        parsed.best && typeof parsed.best.time === 'number'
          ? { time: parsed.best.time, age2: parsed.best.age2 ?? null }
          : board[0]
            ? { time: board[0].time, age2: board[0].age2 }
            : null,
      tutorialSeen: !!parsed.tutorialSeen,
    };
  } catch {
    return defaultMeta();
  }
}

export function storeMeta(meta: Meta): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // localStorage kapalıysa sessizce devam et.
  }
}

export function recordVictory(
  meta: Meta,
  time: number,
  age2: number | null,
  kills: number,
): RunRecord {
  const entry: BoardEntry = {
    name: sanitizeName(meta.name),
    time,
    age2,
    kills,
    date: Date.now(),
  };
  const previousBest = meta.best?.time ?? Infinity;
  const isBest = time < previousBest;
  const all = [...meta.board, entry].sort((a, b) => a.time - b.time).slice(0, 10);
  const rank = all.findIndex((e) => e === entry) + 1;
  meta.board = all;
  if (isBest) {
    meta.best = { time: entry.time, age2: entry.age2 };
  }
  storeMeta(meta);
  return { rank, isBest, entry };
}

export function notePlay(meta: Meta): void {
  meta.plays += 1;
  storeMeta(meta);
}

export function winnerLabel(place: number): string {
  if (place === 1) return 'ŞAMPİYON';
  if (place === 2) return '2.';
  if (place === 3) return '3.';
  return `${place}.`;
}
