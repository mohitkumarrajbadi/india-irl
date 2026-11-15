/** Nearest trail-road query for drive / surface sampling. */
import type { CityData, TrailRoad } from "./types.ts";

export type TrailHit = {
  trail: TrailRoad;
  /** Distance to centerline. */
  dist: number;
  /** Closest point on centerline. */
  x: number;
  z: number;
};

/** Closest point on segment A→B to P. */
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
  return { x, z, d: Math.hypot(px - x, pz - z) };
}

export function nearestTrail(city: CityData, x: number, z: number, maxDist = 14): TrailHit | null {
  const trails = city.trails;
  if (!trails?.length) return null;
  let best: TrailHit | null = null;
  for (const trail of trails) {
    const pts = trail.points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const hit = closestOnSeg(x, z, a.x, a.z, b.x, b.z);
      if (hit.d > maxDist) continue;
      if (!best || hit.d < best.dist) {
        best = { trail, dist: hit.d, x: hit.x, z: hit.z };
      }
    }
  }
  return best;
}

export function onTrailRoad(city: CityData, x: number, z: number): TrailHit | null {
  const hit = nearestTrail(city, x, z, 10);
  if (!hit) return null;
  if (hit.dist > hit.trail.half + 0.55) return null;
  return hit;
}
