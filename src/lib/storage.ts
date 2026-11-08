import { ANSWER_POOL, BY_CODE } from "../data/countries";
import { previousDay } from "./daily";

export const MAX_GUESSES = 5;

export type Status = "playing" | "won" | "lost";

export interface GameState {
  answer: string; // country code
  guesses: string[]; // country codes, in order
  status: Status;
}

export interface DailyState extends GameState {
  day: string;
}

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  lastWonDay: string | null;
  lastPlayedDay: string | null;
  /** distribution[i] = wins on guess i+1; last slot counts losses. */
  distribution: number[];
}

const DAILY_KEY = "landle:daily";
const STATS_KEY = "landle:stats";
const PRACTICE_KEY = "landle:practice";

// The game was briefly called Landfall; carry over anything saved under the old keys.
try {
  for (const key of [DAILY_KEY, STATS_KEY, PRACTICE_KEY]) {
    const old = key.replace("landle:", "landfall:");
    const value = localStorage.getItem(old);
    if (value !== null && localStorage.getItem(key) === null) localStorage.setItem(key, value);
    localStorage.removeItem(old);
  }
} catch {
  // Storage unavailable: nothing to migrate.
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the game still works, it just won't remember.
  }
}

/** Add a guess and work out the new status. */
export function applyGuess<T extends GameState>(game: T, code: string): T {
  const guesses = [...game.guesses, code];
  const won = code === game.answer;
  const status: Status = won ? "won" : guesses.length >= MAX_GUESSES ? "lost" : "playing";
  return { ...game, guesses, status };
}

function isValid(g: GameState | null): g is GameState {
  return !!g && g.answer in BY_CODE && Array.isArray(g.guesses);
}

function clean<T extends GameState>(g: T): T {
  return { ...g, guesses: g.guesses.filter((c) => c in BY_CODE) };
}

// ---------- Daily ----------

export function loadDaily(day: string, answer: string): DailyState {
  const saved = read<DailyState>(DAILY_KEY);
  if (isValid(saved) && saved.day === day && saved.answer === answer) return clean(saved);
  return { day, answer, guesses: [], status: "playing" };
}

export function saveDaily(game: DailyState) {
  write(DAILY_KEY, game);
}

// ---------- Practice ----------

export function loadPractice(): GameState | null {
  const saved = read<GameState>(PRACTICE_KEY);
  return isValid(saved) ? clean(saved) : null;
}

export function savePractice(game: GameState) {
  write(PRACTICE_KEY, game);
}

/** A random answer, avoiding today's daily country (no spoilers) and the last practice answer. */
export function newPracticeGame(avoid: string[]): GameState {
  const pool = ANSWER_POOL.filter((c) => !avoid.includes(c.code));
  const answer = pool[Math.floor(Math.random() * pool.length)].code;
  return { answer, guesses: [], status: "playing" };
}

// ---------- Stats (daily only) ----------

const emptyStats = (): Stats => ({
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastWonDay: null,
  lastPlayedDay: null,
  distribution: Array(MAX_GUESSES + 1).fill(0),
});

export function loadStats(): Stats {
  const saved = read<Stats>(STATS_KEY);
  if (!saved) return emptyStats();
  const base = emptyStats();
  return {
    ...base,
    ...saved,
    distribution: base.distribution.map((_, i) => saved.distribution?.[i] ?? 0),
  };
}

export function recordResult(stats: Stats, day: string, won: boolean, guessCount: number): Stats {
  if (stats.lastPlayedDay === day) return stats; // already counted
  const distribution = [...stats.distribution];
  distribution[won ? guessCount - 1 : MAX_GUESSES] += 1;

  const currentStreak = won
    ? stats.lastWonDay === previousDay(day)
      ? stats.currentStreak + 1
      : 1
    : 0;

  const next: Stats = {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastWonDay: won ? day : stats.lastWonDay,
    lastPlayedDay: day,
    distribution,
  };
  write(STATS_KEY, next);
  return next;
}

/** A streak only counts if it's still alive: last win was today or yesterday. */
export function liveStreak(stats: Stats, today: string): number {
  if (stats.lastWonDay === today || stats.lastWonDay === previousDay(today)) {
    return stats.currentStreak;
  }
  return 0;
}
