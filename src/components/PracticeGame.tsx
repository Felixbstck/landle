import { useEffect, useState } from "react";
import type { Country } from "../data/countries";
import {
  applyGuess,
  loadPractice,
  newPracticeGame,
  savePractice,
  type GameState,
} from "../lib/storage";
import { Board } from "./Board";
import { ResultShell } from "./ResultPanel";

interface Props {
  /** Today's daily answer, so practice never spoils it. */
  dailyAnswer: string;
}

function initial(dailyAnswer: string): GameState {
  const saved = loadPractice();
  if (saved && !(saved.answer === dailyAnswer && saved.status === "playing")) return saved;
  return newPracticeGame([dailyAnswer]);
}

export function PracticeGame({ dailyAnswer }: Props) {
  const [game, setGame] = useState(() => initial(dailyAnswer));

  useEffect(() => savePractice(game), [game]);

  function handleGuess(country: Country) {
    if (game.status === "playing") setGame(applyGuess(game, country.code));
  }

  function next() {
    setGame(newPracticeGame([dailyAnswer, game.answer]));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Board
      game={game}
      onGuess={handleGuess}
      inputExtra={
        <div className="practice-bar">
          <span>Practice round. Doesn't count towards your streak.</span>
          {game.guesses.length > 0 && (
            <button type="button" className="link" onClick={() => setGame({ ...game, status: "lost" })}>
              Reveal answer
            </button>
          )}
        </div>
      }
      result={
        <ResultShell game={game}>
          <div className="result__foot">
            <div className="result__actions">
              <button type="button" className="btn" onClick={next}>
                Next country
              </button>
              <a className="btn btn--ghost" href="#daily">Today's puzzle</a>
            </div>
          </div>
        </ResultShell>
      }
    />
  );
}
