import { useState, type Dispatch, type SetStateAction } from "react";
import type { Country } from "../data/countries";
import type { Puzzle } from "../lib/daily";
import { applyGuess, loadDaily, recordResult, saveDaily, type Stats } from "../lib/storage";
import { Board } from "./Board";
import { DailyResult } from "./ResultPanel";

interface Props {
  puzzle: Puzzle;
  stats: Stats;
  setStats: Dispatch<SetStateAction<Stats>>;
}

// Remounted (via key) when the date changes, so state always matches the puzzle.
export function DailyGame({ puzzle, stats, setStats }: Props) {
  const [game, setGame] = useState(() => loadDaily(puzzle.day, puzzle.answer.code));

  function handleGuess(country: Country) {
    if (game.status !== "playing") return;
    const next = applyGuess(game, country.code);
    setGame(next);
    saveDaily(next);
    if (next.status !== "playing") {
      setStats((s) => recordResult(s, next.day, next.status === "won", next.guesses.length));
    }
  }

  return (
    <Board
      game={game}
      onGuess={handleGuess}
      result={<DailyResult puzzle={puzzle} game={game} stats={stats} />}
    />
  );
}
