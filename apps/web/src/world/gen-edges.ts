import type { Block, RoadLine } from "./types.ts";

export type Edge = {
  x: number;
  z: number;
  ax: number;
  az: number;
  ox: number;
  oz: number;
  len: number;
  road: RoadLine;
};

export function blockEdges(b: Block, roadsX: RoadLine[], roadsZ: RoadLine[], inset: number): Edge[] {
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  return [
    { x: b.minX, z: b.minZ + inset, ax: 1, az: 0, ox: 0, oz: -1, len: w, road: roadsZ[b.bj] },
    { x: b.minX, z: b.maxZ - inset, ax: 1, az: 0, ox: 0, oz: 1, len: w, road: roadsZ[b.bj + 1] },
    { x: b.minX + inset, z: b.minZ, ax: 0, az: 1, ox: -1, oz: 0, len: d, road: roadsX[b.bi] },
    { x: b.maxX - inset, z: b.minZ, ax: 0, az: 1, ox: 1, oz: 0, len: d, road: roadsX[b.bi + 1] },
  ];
}
