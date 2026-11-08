import { useEffect, useMemo, useState } from "react";
import { DailyGame } from "./components/DailyGame";
import { PracticeGame } from "./components/PracticeGame";
import { getPuzzle, todayKey } from "./lib/daily";
import { liveStreak, loadStats } from "./lib/storage";

type Mode = "daily" | "practice";

/** Today's date key, refreshed if the tab stays open past midnight. */
function useToday(): string {
  const [day, setDay] = useState(todayKey);
  useEffect(() => {
    const check = () => setDay(todayKey());
    const id = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return day;
}

/** Mode lives in the URL hash so practice is linkable and the back button works. */
function useMode(): Mode {
  const read = (): Mode => (location.hash === "#practice" ? "practice" : "daily");
  const [mode, setMode] = useState(read);
  useEffect(() => {
    const onHash = () => {
      setMode(read());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return mode;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function App() {
  const day = useToday();
  const mode = useMode();
  const puzzle = useMemo(() => getPuzzle(day), [day]);
  const [stats, setStats] = useState(loadStats);

  const [y, m, d] = day.split("-").map(Number);

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__meta">
          <span>{mode === "daily" ? `No. ${puzzle.number}` : "Practice"}</span>
          <span>{dateFormat.format(new Date(y, m - 1, d))}</span>
        </div>
        <h1 className="masthead__title">Landle</h1>
        <p className="masthead__sub">
          {mode === "daily"
            ? "One country a day. Five guesses. Each wrong answer tells you how far off you are, and which way to go."
            : "Random countries, as many as you like. Same rules, nothing on the line."}
        </p>
        <div className="masthead__meta masthead__meta--bottom">
          <nav className="tabs" aria-label="Mode">
            <a href="#daily" aria-current={mode === "daily" ? "page" : undefined}>Daily</a>
            <a href="#practice" aria-current={mode === "practice" ? "page" : undefined}>Practice</a>
          </nav>
          <span>
            Streak {liveStreak(stats, day)} <span className="sep">/</span> Best {stats.maxStreak}
          </span>
        </div>
      </header>

      <main>
        {mode === "daily" ? (
          <DailyGame key={day} puzzle={puzzle} stats={stats} setStats={setStats} />
        ) : (
          <PracticeGame dailyAnswer={puzzle.answer.code} />
        )}
      </main>

      <footer className="colophon">
        <h2>How it works</h2>
        <p>
          Distances run between the geographic centre of each country, so neighbours can still be
          a few hundred kilometres apart. The needle shows the starting direction of the shortest route over the
          globe, which isn't always the direction it looks on a flat map. Proximity is 100% at the answer and 0%
          on the opposite side of the world.
        </p>
        <p>
          Everyone gets the same daily country. A new one appears at midnight, your time. Practice
          rounds are random, unlimited, and don't touch your streak.
        </p>
      </footer>
    </div>
  );
}
