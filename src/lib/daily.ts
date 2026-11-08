import { ANSWER_POOL, type Country } from "../data/countries";

// Puzzle No. 1 was this date. Changing it renumbers every puzzle.
const EPOCH_UTC = Date.UTC(2026, 0, 1);
const DAY_MS = 86_400_000;
// Fixed seed so the order of answers is the same for everyone.
const SHUFFLE_SEED = 0x6265_6172; // "bear"

/** Local calendar date as YYYY-MM-DD. Like Wordle, the puzzle rolls over at local midnight. */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function dayIndex(key: string): number {
  return Math.round((keyToUtc(key) - EPOCH_UTC) / DAY_MS);
}

export function previousDay(key: string): string {
  const t = new Date(keyToUtc(key) - DAY_MS);
  return t.toISOString().slice(0, 10);
}

// mulberry32: tiny, deterministic PRNG.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shuffle once, then walk through the list one day at a time so a
// country doesn't repeat until the whole pool has been used.
const ORDER: Country[] = (() => {
  const rand = mulberry32(SHUFFLE_SEED);
  const list = [...ANSWER_POOL].sort((a, b) => a.code.localeCompare(b.code));
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
})();

export interface Puzzle {
  day: string;
  number: number;
  answer: Country;
}

export function getPuzzle(day: string): Puzzle {
  const i = dayIndex(day);
  const n = ORDER.length;
  return { day, number: i + 1, answer: ORDER[((i % n) + n) % n] };
}
