import assert from "node:assert/strict";
import { physicsLodCellCount, physicsLodRing } from "./physics-lod.ts";

assert.equal(physicsLodRing(0), 0);
assert.equal(physicsLodRing(5), 1);
assert.equal(physicsLodRing(25), 2);
assert.equal(physicsLodRing(15, "highway"), 2);
assert.equal(physicsLodRing(0.5, "village"), 0);
assert.equal(physicsLodRing(3, "urban"), 1);

assert.equal(physicsLodCellCount(0), 1);
assert.equal(physicsLodCellCount(1), 9);
assert.equal(physicsLodCellCount(2), 25);

console.log("physics-lod.test.ts ok");
