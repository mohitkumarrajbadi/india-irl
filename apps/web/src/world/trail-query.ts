/** Nearest trail-road query for drive / surface sampling (spatially hashed). */
import { queryTrailCells, trailIndexFor } from "./trail-index.ts";
import type { CityData, TrailRoad } from "./types.ts";

export type TrailHit = {
  trail: TrailRoad;
  dist: number;
  x: number;
  z: number;
};

function closestOnSeg(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): { x: number; z: number; d: number } {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz || 1e-6;
  let t = ((px - ax) * abx + (pz - az) * abz) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + abx * t;
  const z = az + abz * t;
  const dx = px - x;
  const dz = pz - z;
  return { x, z, d: Math.sqrt(dx * dx + dz * dz) };
}

export function nearestTrail(city: CityData, x: number, z: number, maxDist = 14): TrailHit | null {
  const trails = city.trails;
  if (!trails?.length) return null;
  const index = trailIndexFor(city);
  const refs = queryTrailCells(index, x, z, maxDist);
  let best: TrailHit | null = null;
  for (const ref of refs) {
    const trail = trails[ref.ti]!;
    const a = trail.points[ref.si]!;
    const b = trail.points[ref.si + 1]!;
    const hit = closestOnSeg(x, z, a.x, a.z, b.x, b.z);
    if (hit.d > maxDist) continue;
    if (!best || hit.d < best.dist) best = { trail, dist: hit.d, x: hit.x, z: hit.z };
  }
  return best;
}

export function onTrailRoad(city: CityData, x: number, z: number): TrailHit | null {
  const hit = nearestTrail(city, x, z, 10);
  if (!hit) return null;
  if (hit.dist > hit.trail.half + 0.55) return null;
  return hit;
}
