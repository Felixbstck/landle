# Landle

A daily country guessing game. Everyone gets the same country each day; you have five guesses, and each wrong guess shows the distance, compass bearing and proximity to the answer, and is plotted on a world map. There's also an unlimited practice mode with random countries (`#practice`) that doesn't affect stats.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 20+ (Vite 6).

## How it works

- `src/lib/daily.ts`: the answer list is shuffled once with a fixed seed, then indexed by days since 2026-01-01 (local date), so no country repeats until the pool is exhausted. Changing the country list or `SHUFFLE_SEED` changes every future answer.
- `src/lib/geo.ts`: haversine distance and initial great-circle bearing between country centroids.
- `src/lib/storage.ts`: today's game (`landle:daily`), stats/streaks (`landle:stats`) and the current practice game (`landle:practice`) in localStorage.
- `src/components/WorldMap.tsx`: d3-geo Equal Earth projection over world-atlas 110m TopoJSON (lazy-loaded). Guessed countries are shaded by proximity, and the map zooms to fit the guesses. It never zooms toward the answer until the game ends, then draws great-circle routes to it.
- `src/data/atlasIds.ts`: ISO alpha-2 to world-atlas numeric ids. Microstates aren't in the 110m map and only get a pin.
- `src/data/countries.ts`: 197 countries with centroids and aliases. Microstates can be guessed but are never the answer.
- Clues: continent appears after 2 misses, first letter after 4.

To reset locally: `localStorage.clear()` in the browser console.
