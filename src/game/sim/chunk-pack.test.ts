import { CHUNK_SIZE } from "./chunk-cell.ts";
import { packCellColliders } from "./chunk-pack.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const boxes = [
  { minX: 2, maxX: 6, minZ: 2, maxZ: 6, h: 12 },
  { minX: 200, maxX: 210, minZ: 200, maxZ: 210, h: 8 },
];
const packed = packCellColliders(boxes, [], 0, 0);
assert(packed.length === 6, "one box in cell 0,0");
assert(packed[4] === 12, "height");

const empty = packCellColliders(boxes, [], 10, 10);
assert(empty.length === 0, "far cell empty");

const circ = packCellColliders([], [{ x: 10, z: 10, r: 1 }], 0, 0);
assert(circ.length === 6, "circle approx");
assert(CHUNK_SIZE === 64, "chunk size");

console.log("chunk-pack.test.ts ok");
