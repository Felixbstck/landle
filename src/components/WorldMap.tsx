import { geoEqualEarth, geoGraticule10, geoInterpolate, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useMemo, useRef, useState } from "react";
import { ATLAS_ID } from "../data/atlasIds";
import { BY_CODE, type Country } from "../data/countries";
import { bearingDeg, distanceKm, formatKm, proximity } from "../lib/geo";

interface Props {
  guesses: string[];
  answer: Country;
  revealed: boolean;
}

// ---------- Projection (fixed, computed once) ----------

const W = 640;
const NORTH = 84; // crop the empty polar strips: nobody guesses Antarctica
const SOUTH = -57;

const projection = (() => {
  const p = geoEqualEarth().fitWidth(W, { type: "Sphere" });
  const top = p([0, NORTH])![1];
  const [tx, ty] = p.translate();
  return p.translate([tx, ty - top]);
})();
const H = Math.round(projection([0, SOUTH])![1]);
const path = geoPath(projection);
const GRATICULE = path(geoGraticule10()) ?? "";
const WORLD_VIEW: View = [0, 0, W, H];

const project = (c: Country) => projection([c.lng, c.lat]) as [number, number];

/**
 * Direction the route to the answer leaves the guess *on this map*, in degrees clockwise
 * from up. Follows the dashed great-circle line rather than true north, which is skewed
 * away from the centre of an Equal Earth map.
 */
function screenHeading(from: Country, to: Country, km: number): number {
  const step = Math.min(0.5, 150 / Math.max(km, 1));
  const ahead = projection(geoInterpolate([from.lng, from.lat], [to.lng, to.lat])(step));
  const [x0, y0] = project(from);
  const dx = ahead ? ahead[0] - x0 : 0;
  const dy = ahead ? ahead[1] - y0 : 0;
  // Route wraps around the map edge (e.g. Fiji to Samoa): fall back to the compass bearing.
  if (!ahead || Math.abs(dx) > W / 4 || (dx === 0 && dy === 0)) return bearingDeg(from, to);
  return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

/** Put a pin's label on the side opposite its needle so the two never overlap. */
function labelLayout(heading: number, k: number) {
  const r = (heading * Math.PI) / 180;
  const lx = -Math.sin(r); // unit vector pointing away from the needle
  const ly = Math.cos(r);
  const anchor = lx > 0.35 ? "start" : lx < -0.35 ? "end" : "middle";
  const x = lx * 8 * k;
  const y = ly * 8 * k;
  // Two lines: guess number (11px), then distance (9px).
  const first = ly > 0.35 ? y + 9 * k : ly < -0.35 ? y - 11 * k : y - 2 * k;
  return { anchor, x, y1: first, y2: first + 10 * k } as const;
}

// ---------- Country shapes (lazy-loaded so the map data isn't in the main bundle) ----------

interface Shape {
  key: string;
  d: string;
}

type WorldTopo = Topology<{ countries: GeometryCollection<{ name: string }> }>;

let shapeCache: Promise<Shape[]> | null = null;
function loadShapes(): Promise<Shape[]> {
  shapeCache ??= import("world-atlas/countries-110m.json").then((mod) => {
    const topo = ((mod as { default?: unknown }).default ?? mod) as WorldTopo;
    return feature(topo, topo.objects.countries)
      .features.filter((f) => f.id !== "010") // Antarctica
      .map((f) => ({ key: String(f.id ?? f.properties.name), d: path(f) ?? "" }));
  });
  return shapeCache;
}

function useShapes(): Shape[] | null {
  const [shapes, setShapes] = useState<Shape[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadShapes().then((s) => alive && setShapes(s));
    return () => {
      alive = false;
    };
  }, []);
  return shapes;
}

// ---------- Auto-zoom ----------

type View = [x: number, y: number, w: number, h: number];

/** Smallest world-map window (same aspect ratio) that comfortably contains the points. */
function fitView(points: [number, number][]): View {
  if (points.length === 0) return WORLD_VIEW;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 48;
  let w = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, W * 0.3);
  let h = Math.max(Math.max(...ys) - Math.min(...ys) + pad * 2, H * 0.3);
  if (w / h > W / H) h = (w * H) / W;
  else w = (h * W) / H;
  if (w >= W) return WORLD_VIEW;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const x = Math.min(Math.max(cx - w / 2, 0), W - w);
  const y = Math.min(Math.max(cy - h / 2, 0), H - h);
  return [x, y, w, h];
}

function useTweenedView(target: View): View {
  const [view, setView] = useState(target);
  const current = useRef(target);
  const key = target.map((n) => n.toFixed(1)).join(",");

  useEffect(() => {
    const from = current.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 700;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - t0) / duration) : 1;
      const e = 1 - (1 - t) ** 3;
      const v = from.map((f, i) => f + (target[i] - f) * e) as View;
      current.current = v;
      setView(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [key]);

  return view;
}

/** Rendered width of an element, so markers can be sized in screen pixels. */
function useWidth<T extends Element>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(W);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

// ---------- Component ----------

export function WorldMap({ guesses, answer, revealed }: Props) {
  const shapes = useShapes();
  const [svgRef, width] = useWidth<SVGSVGElement>();

  const plotted = useMemo(
    () =>
      guesses.map((code, i) => {
        const c = BY_CODE[code];
        const correct = code === answer.code;
        const km = correct ? 0 : distanceKm(c, answer);
        return {
          n: i + 1,
          country: c,
          correct,
          km,
          xy: project(c),
          prox: correct ? 100 : proximity(km),
          heading: correct ? 0 : screenHeading(c, answer, km),
        };
      }),
    [guesses, answer],
  );

  // Never zoom towards the answer until it's revealed, or the map gives it away.
  const target = useMemo(() => {
    const pts = plotted.map((p) => p.xy);
    if (revealed) pts.push(project(answer));
    return fitView(pts);
  }, [plotted, revealed, answer]);
  const view = useTweenedView(target);
  // Map units per screen pixel: keeps markers the same on-screen size at any zoom or width.
  const k = view[2] / width;

  const fills = useMemo(() => {
    const m = new Map<string, { cls: string; opacity?: number }>();
    for (const p of plotted) {
      const id = ATLAS_ID[p.country.code];
      if (id) m.set(id, p.correct ? { cls: "is-answer" } : { cls: "is-guessed", opacity: 0.2 + 0.65 * (p.prox / 100) });
    }
    if (revealed) m.set(ATLAS_ID[answer.code], { cls: "is-answer" });
    return m;
  }, [plotted, revealed, answer]);

  const answerXY = project(answer);
  const routes = revealed
    ? plotted
        .filter((p) => !p.correct)
        .map((p) =>
          path({
            type: "LineString",
            coordinates: [
              [p.country.lng, p.country.lat],
              [answer.lng, answer.lat],
            ],
          }),
        )
    : [];

  return (
    <figure className="map">
      <svg
        ref={svgRef}
        viewBox={view.join(" ")}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          plotted.length
            ? `Map of your guesses: ${plotted.map((p) => p.country.name).join(", ")}${revealed ? `. Answer: ${answer.name}.` : "."}`
            : "World map. Your guesses will appear here."
        }
      >
        <rect x={0} y={0} width={W} height={H} className="map__sea" />
        <path d={GRATICULE} className="map__grid" vectorEffect="non-scaling-stroke" />
        {shapes?.map((s) => {
          const f = fills.get(s.key);
          return (
            <path
              key={s.key}
              d={s.d}
              className={`map__land${f ? ` ${f.cls}` : ""}`}
              style={f?.opacity !== undefined ? { fillOpacity: f.opacity } : undefined}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {routes.map((d, i) => (
          <path key={i} d={d ?? ""} className="map__route" vectorEffect="non-scaling-stroke" />
        ))}
        {revealed && (
          <circle cx={answerXY[0]} cy={answerXY[1]} r={8 * k} className="map__target" vectorEffect="non-scaling-stroke" />
        )}
        {plotted.map((p) => {
          if (p.correct) {
            return (
              <g key={p.n} className="map__pin is-correct">
                <circle cx={p.xy[0]} cy={p.xy[1]} r={3.5 * k} />
                <text x={p.xy[0] + 6 * k} y={p.xy[1] - 5 * k} fontSize={11 * k}>
                  {p.n}
                </text>
              </g>
            );
          }
          const label = labelLayout(p.heading, k);
          return (
            <g key={p.n} className="map__pin" transform={`translate(${p.xy[0]} ${p.xy[1]})`}>
              <g className="map__needle" transform={`rotate(${p.heading}) scale(${k})`}>
                <path d="M0 -4 V-14" />
                <path d="M0 -20 L3.4 -12.5 L0 -14 L-3.4 -12.5 Z" />
              </g>
              <circle r={3.5 * k} />
              <text x={label.x} y={label.y1} fontSize={11 * k} textAnchor={label.anchor}>
                {p.n}
              </text>
              <text className="map__km" x={label.x} y={label.y2} fontSize={9 * k} textAnchor={label.anchor}>
                {formatKm(p.km)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        {revealed
          ? "Dashed lines show the shortest route from each guess to the answer."
          : plotted.length
            ? "Needles point along the shortest route. Countries are shaded by proximity: darker means closer."
            : "Your guesses will be plotted here."}
      </figcaption>
    </figure>
  );
}
