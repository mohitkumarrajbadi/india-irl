/** Spatial hash for trail segments — O(nearby) instead of O(all segments)/frame. */
import type { CityData, TrailRoad } from "./types.ts";

const CELL = 28;

export type TrailSegRef = { ti: number; si: number };

export type TrailIndex = {
  cell: Map<number, TrailSegRef[]>;
  trails: TrailRoad[];
};

function key(cx: number, cz: number): number {
  return ((cx + 512) << 12) | ((cz + 512) & 0xfff);
}

function cellOf(x: number, z: number): { cx: number; cz: number } {
  return { cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) };
}

export function buildTrailIndex(trails: TrailRoad[]): TrailIndex {
  const cell = new Map<number, TrailSegRef[]>();
  for (let ti = 0; ti < trails.length; ti += 1) {
    const pts = trails[ti]!.points;
    for (let si = 0; si < pts.length - 1; si += 1) {
      const a = pts[si]!;
      const b = pts[si + 1]!;
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minZ = Math.min(a.z, b.z);
      const maxZ = Math.max(a.z, b.z);
      const c0 = cellOf(minX, minZ);
      const c1 = cellOf(maxX, maxZ);
      for (let cx = c0.cx; cx <= c1.cx; cx += 1) {
        for (let cz = c0.cz; cz <= c1.cz; cz += 1) {
          const k = key(cx, cz);
          let bucket = cell.get(k);
          if (!bucket) {
            bucket = [];
            cell.set(k, bucket);
          }
          bucket.push({ ti, si });
        }
      }
    }
  }
  return { cell, trails };
}

const cache = new WeakMap<CityData, TrailIndex>();

export function trailIndexFor(city: CityData): TrailIndex {
  let idx = cache.get(city);
  if (!idx) {
    idx = buildTrailIndex(city.trails ?? []);
    cache.set(city, idx);
  }
  return idx;
}

export function queryTrailCells(
  index: TrailIndex,
  x: number,
  z: number,
  radius: number,
): TrailSegRef[] {
  const out: TrailSegRef[] = [];
  const seen = new Set<number>();
  const c0 = cellOf(x - radius, z - radius);
  const c1 = cellOf(x + radius, z + radius);
  for (let cx = c0.cx; cx <= c1.cx; cx += 1) {
    for (let cz = c0.cz; cz <= c1.cz; cz += 1) {
      const bucket = index.cell.get(key(cx, cz));
      if (!bucket) continue;
      for (const ref of bucket) {
        const id = (ref.ti << 16) | ref.si;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(ref);
      }
    }
  }
  return out;
}
