import { BY_CODE, type Country } from "../data/countries";
import { bearingDeg, compass, distanceKm, formatKm, proximity } from "../lib/geo";
import { MAX_GUESSES } from "../lib/storage";

interface Props {
  guesses: string[];
  answer: Country;
}

export function GuessTable({ guesses, answer }: Props) {
  return (
    <div className="ledger" role="table" aria-label="Your guesses">
      <div className="ledger__row ledger__head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">Country</span>
        <span role="columnheader" className="num">Distance</span>
        <span role="columnheader" className="center">Dir.</span>
        <span role="columnheader" className="num">Prox.</span>
      </div>
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const code = guesses[i];
        if (!code) {
          return (
            <div className="ledger__row is-empty" role="row" key={i}>
              <span role="cell">{i + 1}</span>
              <span role="cell" className="ledger__blank" />
              <span role="cell" />
              <span role="cell" />
              <span role="cell" />
            </div>
          );
        }
        const guess = BY_CODE[code];
        const correct = code === answer.code;
        const km = correct ? 0 : distanceKm(guess, answer);
        const bearing = bearingDeg(guess, answer);
        const prox = correct ? 100 : proximity(km);
        return (
          <div className={`ledger__row${correct ? " is-correct" : ""}`} role="row" key={i}>
            <span role="cell">{i + 1}</span>
            <span role="cell" className="ledger__name">{guess.name}</span>
            <span role="cell" className="num">{correct ? "—" : formatKm(km)}</span>
            <span role="cell" className="center">
              {correct ? (
                <span className="tick" aria-label="Correct">✓</span>
              ) : (
                <span className="dir" title={`${Math.round(bearing)}°`}>
                  <Needle deg={bearing} />
                  <span className="dir__label">{compass(bearing)}</span>
                </span>
              )}
            </span>
            <span role="cell" className="num">
              <span className="prox">
                <span className="prox__bar" aria-hidden>
                  <span style={{ width: `${prox}%` }} />
                </span>
                {prox}%
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Needle({ deg }: { deg: number }) {
  return (
    <svg
      className="needle"
      viewBox="0 0 20 20"
      width="16"
      height="16"
      style={{ transform: `rotate(${deg}deg)` }}
      aria-hidden
    >
      <path d="M10 1.5 L14 11 L10 9.2 L6 11 Z" fill="currentColor" />
      <path d="M10 9.2 V18.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
