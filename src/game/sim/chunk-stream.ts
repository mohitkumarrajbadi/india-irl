/** Keep the sim worker’s resident collider set = 9-cell neighborhood. */
import type { SimBridge } from "@india-irl/engine";
import type { Aabb, Circle } from "@/world/types";
import { cellKey, cellOf, neighborhood } from "./chunk-cell.ts";
import { packCellColliders } from "./chunk-pack.ts";

const loaded = new Set<string>();

export function clearChunkStream(): void {
  loaded.clear();
}

export function syncWorldChunks(
  bridge: SimBridge,
  x: number,
  z: number,
  boxes: readonly Aabb[],
  circles: readonly Circle[],
): void {
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
    const packed = packCellColliders(boxes, circles, c.cx, c.cz);
    bridge.loadChunk(c.cx, c.cz, packed);
    loaded.add(key);
  }
}

export function chunkStreamResidentCount(): number {
  return loaded.size;
}
