/**
 * Road Builder — city road lines → chunk-local trimesh + curb boxes.
 * Visual roads / splats sit at Y=0; collider verts use the same plane.
 */
import type { CityData, RoadLine } from "@/world/types";
import { CHUNK_SIZE } from "./chunk-cell.ts";

/** Must match packages/engine materials.ROAD_SURFACE_Y (splat ↔ collider). */
export const ROAD_SURFACE_Y = 0;

export type RoadChunkMesh = {
  verts: Float32Array;
  indices: Uint32Array;
  /** Thin curb / median AABBs: minX,minY,minZ,maxX,maxY,maxZ */
  curbs: Float32Array;
};

type V = number[];
type I = number[];

function pushQuad(verts: V, indices: I, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const b = verts.length / 3;
  verts.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
  indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
}

function clipPushRoadX(
  verts: V,
  indices: I,
  curbs: V,
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
  pushQuad(verts, indices, x0, z0, x1, z1, ROAD_SURFACE_Y);
  if (road.arterial && road.median > 0) {
    const m = road.median * 0.5;
    curbs.push(road.c - m, 0, z0, road.c + m, 0.35, z1);
  }
}

function clipPushRoadZ(
  verts: V,
  indices: I,
  curbs: V,
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
  pushQuad(verts, indices, x0, z0, x1, z1, ROAD_SURFACE_Y);
  if (road.arterial && road.median > 0) {
    const m = road.median * 0.5;
    curbs.push(x0, 0, road.c - m, x1, 0.35, road.c + m);
  }
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
    clipPushRoadX(verts, indices, curbs, r, bounds.minZ, bounds.maxZ, cellMinX, cellMaxX, cellMinZ, cellMaxZ);
  }
  for (const r of roadsZ) {
    clipPushRoadZ(verts, indices, curbs, r, bounds.minX, bounds.maxX, cellMinX, cellMaxX, cellMinZ, cellMaxZ);
  }

  return {
    verts: new Float32Array(verts),
    indices: new Uint32Array(indices),
    curbs: new Float32Array(curbs),
  };
}

/** Splat / mesh Y alignment — roads and colliders share this plane. */
export function roadSurfaceY(_x: number, _z: number): number {
  return ROAD_SURFACE_Y;
}
