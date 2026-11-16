/**
 * Collision Manager — spatial chunk stream + road trimesh cook.
 * Main thread packs; Rapier worker owns colliders (CCD on vehicles).
 */
import type { SimBridge } from "@india-irl/engine";
import type { CityData } from "@/world/types";
import { cellKey, cellOf, neighborhood } from "./chunk-cell.ts";
import { packCellColliders } from "./chunk-pack.ts";
import { physicsLodRing, type PhysicsLodRing } from "./physics-lod.ts";
import { buildRoadChunk, roadSurfaceY } from "./road-builder.ts";

const loaded = new Set<string>();

export function clearCollisionChunks(): void {
  loaded.clear();
}

export function collisionResidentCount(): number {
  return loaded.size;
}

/**
 * Keep worker resident set = LOD neighborhood around (x,z).
 * Packs building AABBs + road surface trimesh + median curbs.
 * @param speed m/s — expands ring at highway speeds; shrinks when nearly stopped
 * @param region optional terrain region for LOD bias
 */
export function syncCollisionChunks(
  bridge: SimBridge,
  city: CityData,
  x: number,
  z: number,
  speed = 0,
  region?: string,
): void {
  const { cx, cz } = cellOf(x, z);
  const ring: PhysicsLodRing = physicsLodRing(speed, region);
  const want = neighborhood(cx, cz, ring);
  const wantKeys = new Set(want.map((c) => cellKey(c.cx, c.cz)));

  for (const key of [...loaded]) {
    if (wantKeys.has(key)) continue;
    const [sx, sz] = key.split(",").map(Number);
    bridge.unloadChunk(sx, sz);
    loaded.delete(key);
  }

  for (const c of want) {
    const key = cellKey(c.cx, c.cz);
    if (loaded.has(key)) continue;
    const road = buildRoadChunk(city, c.cx, c.cz);
    const boxes = packCellColliders(city.boxes, city.circles, c.cx, c.cz, road.curbs);
    // Transferable road buffers — see SimBridge.loadChunk.
    bridge.loadChunk(
      c.cx,
      c.cz,
      boxes,
      road.verts.length ? road.verts : undefined,
      road.indices.length ? road.indices : undefined,
    );
    loaded.add(key);
  }
}

export { roadSurfaceY };
