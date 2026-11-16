/**
 * Road Builder — city road lines → chunk-local trimesh + curb boxes.
 * Samples terrain height + flyover deck so Rapier matches arcade elevation.
 * Arcade default is unchanged (this only runs when Rapier chunks stream).
 */
import { heightAt, flyoverHeightAt, underpassHeightAt } from "../../world/terrain-sample.ts";
import type { CityData, RoadLine } from "../../world/types.ts";
import { CHUNK_SIZE } from "./chunk-cell.ts";

/** Flat-core default; elevated verts override per sample. */
export const ROAD_SURFACE_Y = 0;

/** Grid step for road height sampling (metres). */
const GRID = 8;

export type RoadChunkMesh = {
  verts: Float32Array;
  indices: Uint32Array;
  /** Thin curb / median AABBs: minX,minY,minZ,maxX,maxY,maxZ */
  curbs: Float32Array;
};

type V = number[];
type I = number[];

function pushQuadVarying(
  verts: V,
  indices: I,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y00: number,
  y10: number,
  y11: number,
  y01: number,
): void {
  const b = verts.length / 3;
  verts.push(x0, y00, z0, x1, y10, z0, x1, y11, z1, x0, y01, z1);
  indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

function pushHeightGrid(
  verts: V,
  indices: I,
  city: CityData,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  yAt: (x: number, z: number) => number,
): void {
  if (x1 - x0 < 0.2 || z1 - z0 < 0.2) return;
  for (let z = z0; z < z1 - 1e-6; z += GRID) {
    const zb = Math.min(z + GRID, z1);
    for (let x = x0; x < x1 - 1e-6; x += GRID) {
      const xb = Math.min(x + GRID, x1);
      if (xb - x < 0.15 || zb - z < 0.15) continue;
      pushQuadVarying(
        verts,
        indices,
        x,
        z,
        xb,
        zb,
        yAt(x, z),
        yAt(xb, z),
        yAt(xb, zb),
        yAt(x, zb),
      );
    }
  }
}

function groundY(city: CityData, x: number, z: number): number {
  return underpassHeightAt(city, x, z) ?? heightAt(city, x, z);
}

/** Always-on deck/ramp surface for static colliders (Infinity yHint → mid deck). */
function deckY(city: CityData, x: number, z: number): number | null {
  return flyoverHeightAt(city, x, z, Number.POSITIVE_INFINITY);
}

function clipPushRoadX(
  verts: V,
  indices: I,
  curbs: V,
  city: CityData,
  road: RoadLine,
  zMin: number,
  zMax: number,
  cellMinX: number,
  cellMaxX: number,
  cellMinZ: number,
  cellMaxZ: number,
): void {
  const x0 = Math.max(cellMinX, road.c - road.half);
  const x1 = Math.min(cellMaxX, road.c + road.half);
  const z0 = Math.max(cellMinZ, zMin);
  const z1 = Math.min(cellMaxZ, zMax);
  if (x1 - x0 < 0.2 || z1 - z0 < 0.2) return;
  pushHeightGrid(verts, indices, city, x0, z0, x1, z1, (x, z) => groundY(city, x, z));
  if (road.arterial && road.median > 0) {
    const m = road.median * 0.5;
    const y = groundY(city, road.c, (z0 + z1) * 0.5);
    curbs.push(road.c - m, y, z0, road.c + m, y + 0.35, z1);
  }
}

function clipPushRoadZ(
  verts: V,
  indices: I,
  curbs: V,
  city: CityData,
  road: RoadLine,
  xMin: number,
  xMax: number,
  cellMinX: number,
  cellMaxX: number,
  cellMinZ: number,
  cellMaxZ: number,
): void {
  const z0 = Math.max(cellMinZ, road.c - road.half);
  const z1 = Math.min(cellMaxZ, road.c + road.half);
  const x0 = Math.max(cellMinX, xMin);
  const x1 = Math.min(cellMaxX, xMax);
  if (x1 - x0 < 0.2 || z1 - z0 < 0.2) return;
  pushHeightGrid(verts, indices, city, x0, z0, x1, z1, (x, z) => groundY(city, x, z));
  if (road.arterial && road.median > 0) {
    const m = road.median * 0.5;
    const y = groundY(city, (x0 + x1) * 0.5, road.c);
    curbs.push(x0, y, road.c - m, x1, y + 0.35, road.c + m);
  }
}

/** Elevated flyover deck + ramps as a second collider layer in overlapping cells. */
function pushFlyoverDeck(
  verts: V,
  indices: I,
  city: CityData,
  cellMinX: number,
  cellMaxX: number,
  cellMinZ: number,
  cellMaxZ: number,
): void {
  const fo = city.flyover;
  if (!fo) return;
  const x0 = Math.max(cellMinX, fo.x - fo.half);
  const x1 = Math.min(cellMaxX, fo.x + fo.half);
  const z0 = Math.max(cellMinZ, fo.z0);
  const z1 = Math.min(cellMaxZ, fo.z1);
  if (x1 - x0 < 0.2 || z1 - z0 < 0.2) return;
  pushHeightGrid(verts, indices, city, x0, z0, x1, z1, (x, z) => {
    const y = deckY(city, x, z);
    return y ?? fo.deckY + 0.3;
  });
}

/** Build road trimesh + median curbs for one spatial cell. */
export function buildRoadChunk(city: CityData, cx: number, cz: number): RoadChunkMesh {
  const cellMinX = cx * CHUNK_SIZE;
  const cellMaxX = cellMinX + CHUNK_SIZE;
  const cellMinZ = cz * CHUNK_SIZE;
  const cellMaxZ = cellMinZ + CHUNK_SIZE;
  const { bounds, roadsX, roadsZ } = city;
  const verts: V = [];
  const indices: I = [];
  const curbs: V = [];

  for (const r of roadsX) {
    clipPushRoadX(verts, indices, curbs, city, r, bounds.minZ, bounds.maxZ, cellMinX, cellMaxX, cellMinZ, cellMaxZ);
  }
  for (const r of roadsZ) {
    clipPushRoadZ(verts, indices, curbs, city, r, bounds.minX, bounds.maxX, cellMinX, cellMaxX, cellMinZ, cellMaxZ);
  }
  pushFlyoverDeck(verts, indices, city, cellMinX, cellMaxX, cellMinZ, cellMaxZ);

  return {
    verts: new Float32Array(verts),
    indices: new Uint32Array(indices),
    curbs: new Float32Array(curbs),
  };
}

/** Ground / apron Y for splat alignment at a world point (no flyover deck). */
export function roadSurfaceY(city: CityData | null, x: number, z: number): number {
  if (!city) return ROAD_SURFACE_Y;
  return heightAt(city, x, z);
}
