import { SNAP_STRIDE } from "./protocol.ts";

export type SnapshotEntity = {
  id: number;
  kind: number;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  speed: number;
  flags: number;
};

export function decodeSnapshot(data: Float32Array, count: number): SnapshotEntity[] {
  const list: SnapshotEntity[] = [];
  for (let i = 0; i < count; i += 1) {
    const o = i * SNAP_STRIDE;
    list.push({
      id: data[o],
      kind: data[o + 1],
      x: data[o + 2],
      y: data[o + 3],
      z: data[o + 4],
      qx: data[o + 5],
      qy: data[o + 6],
      qz: data[o + 7],
      qw: data[o + 8],
      speed: data[o + 9],
      flags: data[o + 10],
    });
  }
  return list;
}
