import { useMemo, type ReactNode } from "react";
import { BY_CODE, type Country } from "../data/countries";
import type { GameState } from "../lib/storage";
import { GuessInput } from "./GuessInput";
import { GuessTable } from "./GuessTable";
import { WorldMap } from "./WorldMap";

interface Props {
  game: GameState;
  onGuess: (country: Country) => void;
  /** Shown under the input while playing (e.g. a give-up link in practice). */
  inputExtra?: ReactNode;
  /** Shown once the game is over. */
  result: ReactNode;
}

/** Everything both modes share: clues, guess ledger, input and map. */
export function Board({ game, onGuess, inputExtra, result }: Props) {
  const answer = BY_CODE[game.answer];
  const over = game.status !== "playing";
  const misses = game.guesses.filter((c) => c !== game.answer).length;
  const used = useMemo(() => new Set(game.guesses), [game.guesses]);

  return (
    <>
      <WorldMap guesses={game.guesses} answer={answer} revealed={over} />

      {over ? (
        result
      ) : (
        <>
          <GuessInput
            key={game.answer}
            used={used}
            guessNumber={game.guesses.length + 1}
            onGuess={onGuess}
          />
          {inputExtra}
        </>
      )}

      <div className="clues">
        <Clue label="Continent" value={answer.continent} revealAt={2} misses={misses} over={over} />
        <Clue label="Starts with" value={answer.name[0]} revealAt={4} misses={misses} over={over} />
      </div>

      <GuessTable guesses={game.guesses} answer={answer} />
    </>
  );
}

function Clue(props: { label: string; value: string; revealAt: number; misses: number; over: boolean }) {
  const shown = props.over || props.misses >= props.revealAt;
  const left = props.revealAt - props.misses;
  return (
    <div className={`clue${shown ? " is-shown" : ""}`}>
      <span className="eyebrow">{props.label}</span>
      <span className="clue__value">
        {shown ? props.value : `After ${left} more ${left === 1 ? "miss" : "misses"}`}
      </span>
    </div>
  );
}
