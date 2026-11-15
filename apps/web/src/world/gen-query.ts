import type { Block, CityData } from "./types.ts";

/** Index of the last grid line at or below `v`, clamped to a valid block index. */
export function lineIndex(lines: readonly number[], v: number): number {
  let lo = 0;
  let hi = lines.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lines[mid] <= v) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function blockAt(city: CityData, x: number, z: number): Block {
  const bi = lineIndex(city.xs, x);
  const bj = lineIndex(city.zs, z);
  return city.blocks[bi * city.config.rows + bj];
}

export function districtNameAt(city: CityData, x: number, z: number): string {
  const b = blockAt(city, x, z);
  const lm = city.landmarks.find((l) => l.spec.bi === b.bi && l.spec.bj === b.bj);
  if (lm && b.kind === "lake") return lm.spec.label;
  return city.config.districts[b.district]?.name ?? city.config.name;
}
