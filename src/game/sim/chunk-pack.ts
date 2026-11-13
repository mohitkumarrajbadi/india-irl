/**
 * Pack city AABBs (+ circle approximations) into Rapier LOAD_CHUNK boxes SoA:
 * minX, minY, minZ, maxX, maxY, maxZ per box.
 */
import type { Aabb, Circle } from "../../world/types.ts";
import { CHUNK_SIZE } from "./chunk-cell.ts";

const PAD = 0.15;

export function packCellColliders(
  boxes: readonly Aabb[],
  circles: readonly Circle[],
  cx: number,
  cz: number,
): Float32Array {
  const minX = cx * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE;
  const minZ = cz * CHUNK_SIZE;
  const maxZ = minZ + CHUNK_SIZE;
  const tmp: number[] = [];

  for (const b of boxes) {
    if (b.maxX < minX || b.minX > maxX || b.maxZ < minZ || b.minZ > maxZ) continue;
    const h = Math.max(1.2, b.h ?? 8);
    tmp.push(b.minX - PAD, 0, b.minZ - PAD, b.maxX + PAD, h, b.maxZ + PAD);
  }
  for (const c of circles) {
    if (c.x + c.r < minX || c.x - c.r > maxX || c.z + c.r < minZ || c.z - c.r > maxZ) continue;
    const r = c.r + PAD;
    tmp.push(c.x - r, 0, c.z - r, c.x + r, 2.4, c.z + r);
  }
  return new Float32Array(tmp);
}
