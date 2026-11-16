import type { Block, CityData } from "./types.ts";

/** Index of the last grid line at or below `v`, clamped to a valid block index. */
export function lineIndex(lines: readonly number[], v: number): number {
  let lo = 0;
  let hi = lines.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid]! <= v) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Find block by AABB — required when cities are merged (OMMO world). */
function blockByBounds(city: CityData, x: number, z: number): Block | null {
  for (const b of city.blocks) {
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return b;
  }
  return null;
}

/**
 * Block under a world point.
 * Single-city packs use the road-line grid index; merged OMMO worlds
 * concatenate many grids so we fall back to AABB search.
 */
export function blockAt(city: CityData, x: number, z: number): Block | null {
  // OMMO merges multiple city grids — index math no longer holds.
  const merged = city.config.name === "OMMO";
  if (!merged && city.xs.length >= 2 && city.zs.length >= 2) {
    const bi = lineIndex(city.xs, x);
    const bj = lineIndex(city.zs, z);
    const indexed = city.blocks[bi * city.config.rows + bj];
    if (indexed) return indexed;
  }
  return blockByBounds(city, x, z);
}

export function districtNameAt(city: CityData, x: number, z: number): string {
  const b = blockAt(city, x, z);
  if (!b) return city.config.name;
  const lm = city.landmarks.find((l) => l.spec.bi === b.bi && l.spec.bj === b.bj);
  if (lm && b.kind === "lake") return lm.spec.label;
  return city.config.districts[b.district]?.name ?? city.config.name;
}
