import { useEffect, useState, type ReactNode } from "react";
import { BY_CODE } from "../data/countries";
import type { Puzzle } from "../lib/daily";
import { arrow, bearingDeg, distanceKm, formatKm } from "../lib/geo";
import { MAX_GUESSES, liveStreak, type GameState, type Stats } from "../lib/storage";

export function ResultHeadline({ game }: { game: GameState }) {
  const won = game.status === "won";
  const name = BY_CODE[game.answer].name;
  const n = game.guesses.length;
  return (
    <>
      <p className="eyebrow">{won ? "Solved" : game.guesses.length < MAX_GUESSES ? "Revealed" : "Out of guesses"}</p>
      <h2 className="result__headline">
        {won ? (
          <>
            <strong>{name}</strong>, in {n} {n === 1 ? "guess" : "guesses"}.
          </>
        ) : (
          <>
            It was <strong>{name}</strong>.
          </>
        )}
      </h2>
    </>
  );
}

export function ResultShell({ game, children }: { game: GameState; children: ReactNode }) {
  return (
    <section className="result" aria-live="polite">
      <ResultHeadline game={game} />
      {children}
    </section>
  );
}

// ---------- Daily ----------

export function DailyResult({ puzzle, game, stats }: { puzzle: Puzzle; game: GameState; stats: Stats }) {
  const won = game.status === "won";
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxBar = Math.max(1, ...stats.distribution);
  const highlight = won ? game.guesses.length - 1 : MAX_GUESSES;

  return (
    <ResultShell game={game}>
      <dl className="stats">
        <div><dt>Played</dt><dd>{stats.played}</dd></div>
        <div><dt>Win rate</dt><dd>{winPct}%</dd></div>
        <div><dt>Streak</dt><dd>{liveStreak(stats, puzzle.day)}</dd></div>
        <div><dt>Best</dt><dd>{stats.maxStreak}</dd></div>
      </dl>

      <div className="dist" aria-label="Guess distribution">
        {stats.distribution.map((n, i) => (
          <div className={`dist__row${i === highlight ? " is-current" : ""}`} key={i}>
            <span className="dist__label">{i < MAX_GUESSES ? i + 1 : "X"}</span>
            <span className="dist__track">
              <span className="dist__bar" style={{ width: `${(n / maxBar) * 100}%` }} />
            </span>
            <span className="dist__n">{n}</span>
          </div>
        ))}
      </div>

      <div className="result__foot">
        <div className="result__actions">
          <ShareButton puzzle={puzzle} game={game} />
          <a className="btn btn--ghost" href="#practice">Practice</a>
        </div>
        <div className="next">
          <span className="eyebrow">Next country in</span>
          <Countdown />
        </div>
      </div>
    </ResultShell>
  );
}

function shareText(puzzle: Puzzle, game: GameState): string {
  const answer = BY_CODE[game.answer];
  const score = game.status === "won" ? game.guesses.length : "X";
  const lines = game.guesses.map((code) => {
    if (code === game.answer) return "✓";
    const g = BY_CODE[code];
    return `${arrow(bearingDeg(g, answer))} ${formatKm(distanceKm(g, answer))}`;
  });
  return [`Landle No. ${puzzle.number}: ${score}/${MAX_GUESSES}`, ...lines, location.origin].join("\n");
}

function ShareButton({ puzzle, game }: { puzzle: Puzzle; game: GameState }) {
  const [label, setLabel] = useState("Copy result");

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText(puzzle, game));
      setLabel("Copied");
    } catch {
      setLabel("Couldn't copy");
    }
    setTimeout(() => setLabel("Copy result"), 1800);
  }

  return (
    <button type="button" className="btn" onClick={share}>
      {label}
    </button>
  );
}

function Countdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="countdown">
      {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </span>
  );
}
