/**
 * Keep the sim worker’s resident collider set = physics-LOD neighborhood.
 * Delegates to CollisionManager (road trimesh + obstacle AABBs).
 */
import type { SimBridge } from "@india-irl/engine";
import type { Aabb, Circle } from "@/world/types";
import { runtime } from "@/game/runtime";
import {
  clearCollisionChunks,
  collisionResidentCount,
  syncCollisionChunks,
} from "./collision-manager.ts";

export function clearChunkStream(): void {
  clearCollisionChunks();
}

export function chunkStreamResidentCount(): number {
  return collisionResidentCount();
}

/** @deprecated Prefer syncCollisionChunks(bridge, city, x, z) — kept for call-site compat. */
export function syncWorldChunks(
  bridge: SimBridge,
  x: number,
  z: number,
  _boxes: readonly Aabb[],
  _circles: readonly Circle[],
): void {
  const city = runtime.city;
  if (!city) return;
  syncCollisionChunks(bridge, city, x, z);
}
