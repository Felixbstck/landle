import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Country } from "../data/countries";
import { findExact, normalize, search } from "../lib/search";
import { MAX_GUESSES } from "../lib/storage";

interface Props {
  used: Set<string>;
  guessNumber: number;
  onGuess: (country: Country) => void;
}

export function GuessInput({ used, guessNumber, onGuess }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const suggestions = useMemo(() => search(query, used), [query, used]);
  const showList = open && suggestions.length > 0;

  function commit(country: Country) {
    if (used.has(country.code)) {
      setError(`You've already guessed ${country.name}.`);
      return;
    }
    onGuess(country);
    setQuery("");
    setOpen(false);
    setActive(0);
    setError(null);
    inputRef.current?.focus();
  }

  function submit() {
    if (showList && suggestions[active]) return commit(suggestions[active]);
    const exact = findExact(query);
    if (exact) return commit(exact);
    if (query.trim()) setError("That isn't a country on the list. Pick one from the suggestions.");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setOpen(true);
        setActive((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        submit();
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  return (
    <div className="guess-input">
      <label htmlFor={`${listId}-input`} className="eyebrow">
        Guess {guessNumber} of {MAX_GUESSES}
      </label>
      <div className="guess-input__row">
        <div className="combo">
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Start typing a country"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
              setError(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
          {showList && (
            <ul className="combo__list" id={listId} role="listbox">
              {suggestions.map((c, i) => (
                <li
                  key={c.code}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "is-active" : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(c)}
                >
                  <Highlight text={c.name} query={query} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn" onClick={submit} disabled={!query.trim()}>
          Guess
        </button>
      </div>
      <p className="guess-input__msg" role="status">
        {error ?? " "}
      </p>
    </div>
  );
}

/** Underline the part of the name that matches what was typed (accent-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query);
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const at = q ? plain.indexOf(q) : -1;
  if (at < 0) return <>{text}</>;
  // NFD stripping keeps one char per base letter for these names, so indexes line up.
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}
