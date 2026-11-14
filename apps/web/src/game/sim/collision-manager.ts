/**
 * Collision Manager — spatial chunk stream + road trimesh cook.
 * Main thread packs; Rapier worker owns colliders (CCD on vehicles).
 */
import type { SimBridge } from "@india-irl/engine";
import type { CityData } from "@/world/types";
import { cellKey, cellOf, neighborhood } from "./chunk-cell.ts";
import { packCellColliders } from "./chunk-pack.ts";
import { buildRoadChunk, roadSurfaceY } from "./road-builder.ts";

const loaded = new Set<string>();

export function clearCollisionChunks(): void {
  loaded.clear();
}

export function collisionResidentCount(): number {
  return loaded.size;
}

/**
 * Keep worker resident set = 9-cell neighborhood around (x,z).
 * Packs building AABBs + road surface trimesh + median curbs.
 */
export function syncCollisionChunks(bridge: SimBridge, city: CityData, x: number, z: number): void {
  const { cx, cz } = cellOf(x, z);
  const want = neighborhood(cx, cz);
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
