import { COUNTRIES, type Country } from "../data/countries";

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Entry {
  country: Country;
  name: string;
  aliases: string[];
}

const INDEX: Entry[] = COUNTRIES.map((country) => ({
  country,
  name: normalize(country.name),
  aliases: (country.aliases ?? []).map(normalize),
}));

function score(e: Entry, q: string): number {
  if (e.name === q) return 0;
  if (e.name.startsWith(q)) return 1;
  if (e.aliases.some((a) => a === q)) return 0;
  if (e.name.split(" ").some((w) => w.startsWith(q))) return 2;
  if (e.aliases.some((a) => a.startsWith(q))) return 3;
  if (e.name.includes(q)) return 4;
  return Infinity;
}

export function search(query: string, exclude: Set<string>, limit = 8): Country[] {
  const q = normalize(query);
  if (!q) return [];
  return INDEX.filter((e) => !exclude.has(e.country.code))
    .map((e) => ({ e, s: score(e, q) }))
    .filter((x) => x.s !== Infinity)
    .sort((a, b) => a.s - b.s || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((x) => x.e.country);
}

/** Exact match on name or alias, for when the player types the full name and hits Enter. */
export function findExact(query: string): Country | undefined {
  const q = normalize(query);
  return INDEX.find((e) => e.name === q || e.aliases.includes(q))?.country;
}
