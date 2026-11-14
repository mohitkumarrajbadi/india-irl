/**
 * Pack city obstacles + road curbs into Rapier LOAD_CHUNK boxes SoA:
 * minX, minY, minZ, maxX, maxY, maxZ per box.
 * Road surface trimesh is built separately (see road-builder).
 */
import type { Aabb, Circle } from "../../world/types.ts";
import { CHUNK_SIZE } from "./chunk-cell.ts";

const PAD = 0.15;

export function packCellColliders(
  boxes: readonly Aabb[],
  circles: readonly Circle[],
  cx: number,
  cz: number,
  extraBoxes?: Float32Array,
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
  if (extraBoxes) {
    for (let i = 0; i + 5 < extraBoxes.length; i += 6) {
      const a0 = extraBoxes[i];
      const a2 = extraBoxes[i + 2];
      const a3 = extraBoxes[i + 3];
      const a5 = extraBoxes[i + 5];
      if (a3 < minX || a0 > maxX || a5 < minZ || a2 > maxZ) continue;
      tmp.push(
        extraBoxes[i],
        extraBoxes[i + 1],
        extraBoxes[i + 2],
        extraBoxes[i + 3],
        extraBoxes[i + 4],
        extraBoxes[i + 5],
      );
    }
  }
  return new Float32Array(tmp);
}
