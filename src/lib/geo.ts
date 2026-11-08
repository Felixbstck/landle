import type { Country } from "../data/countries";

const R = 6371; // km
const HALF_EARTH = Math.PI * R; // furthest two points can be, ~20,015 km
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceKm(a: Country, b: Country): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial great-circle bearing from a to b, in degrees clockwise from north. */
export function bearingDeg(a: Country, b: Country): number {
  const φ1 = rad(a.lat);
  const φ2 = rad(b.lat);
  const Δλ = rad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export function compass(bearing: number): string {
  return POINTS[Math.round(bearing / 45) % 8];
}

const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
export function arrow(bearing: number): string {
  return ARROWS[Math.round(bearing / 45) % 8];
}

/** 100 = same place, 0 = antipode. */
export function proximity(km: number): number {
  return Math.round(Math.max(0, 1 - km / HALF_EARTH) * 100);
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("en-US")} km`;
}
