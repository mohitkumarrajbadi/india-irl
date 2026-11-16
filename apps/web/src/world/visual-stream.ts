/**
 * Distance / chunk based culling for visual instances in the unified world.
 * Physics still uses full StaticGrid / Rapier chunks separately.
 */
import { cellKey, cellOf, CHUNK_SIZE, neighborhood } from "../game/sim/chunk-cell.ts";
import type { Building, CityData, Prop } from "./types.ts";

export type StreamRing = 0 | 1 | 2 | 3;

/** Prefetch ring from vehicle speed (m/s). Highway → larger neighborhood. */
export function streamRingForSpeed(speedMs: number): StreamRing {
  if (speedMs > 28) return 3;
  if (speedMs > 16) return 2;
  if (speedMs > 6) return 1;
  return 1;
}

function inCells(x: number, z: number, keys: Set<string>): boolean {
  const { cx, cz } = cellOf(x, z);
  return keys.has(cellKey(cx, cz));
}

export function activeCellKeys(x: number, z: number, ring: StreamRing): Set<string> {
  const { cx, cz } = cellOf(x, z);
  const r = Math.min(2, ring) as 0 | 1 | 2;
  const cells = neighborhood(cx, cz, r);
  if (ring >= 3) {
    for (let dz = -3; dz <= 3; dz += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        cells.push({ cx: cx + dx, cz: cz + dz });
      }
    }
  }
  return new Set(cells.map((c) => cellKey(c.cx, c.cz)));
}

export function filterBuildings(list: Building[], keys: Set<string>): Building[] {
  return list.filter((b) => inCells(b.x, b.z, keys));
}

export function filterProps<T extends { x: number; z: number }>(list: T[], keys: Set<string>): T[] {
  return list.filter((p) => inCells(p.x, p.z, keys));
}

/** Shallow city view with heavy visual arrays culled to nearby chunks. */
export function sliceCityVisuals(
  city: CityData,
  x: number,
  z: number,
  speedMs: number,
  ring?: StreamRing,
): CityData {
  const r = ring ?? streamRingForSpeed(speedMs);
  const keys = activeCellKeys(x, z, r);
  return {
    ...city,
    buildings: filterBuildings(city.buildings, keys),
    trees: filterProps(city.trees, keys),
    shrubs: filterProps(city.shrubs, keys),
    lamps: filterProps(city.lamps, keys),
    signs: filterProps(city.signs, keys),
    billboards: filterProps(city.billboards, keys),
    tanks: filterProps(city.tanks, keys),
    busStops: filterProps(city.busStops, keys) as Prop[],
    stalls: filterProps(city.stalls, keys) as Prop[],
    extras: filterProps(city.extras, keys) as Prop[],
  };
}

export function streamCellFingerprint(x: number, z: number, ring: StreamRing): string {
  const { cx, cz } = cellOf(x, z);
  return `${cx},${cz},${ring},${CHUNK_SIZE}`;
}
