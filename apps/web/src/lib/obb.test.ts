import assert from "node:assert/strict";
import { obbOverlap, pointInObb, type Obb } from "./obb.ts";

const a: Obb = { x: 0, z: 0, yaw: 0, halfL: 2, halfW: 1 };
const b: Obb = { x: 0, z: 3.5, yaw: 0, halfL: 2, halfW: 1 };
assert.equal(obbOverlap(a, b), true, "overlap along Z");
const c: Obb = { x: 0, z: 5, yaw: 0, halfL: 2, halfW: 1 };
assert.equal(obbOverlap(a, c), false, "separated");
const d: Obb = { x: 2.5, z: 0, yaw: Math.PI / 2, halfL: 2, halfW: 0.5 };
assert.equal(obbOverlap(a, d), true, "rotated overlap");
assert.equal(pointInObb(0, 1.5, a), true);
assert.equal(pointInObb(0, 2.5, a), false);

console.log("obb.test.ts ok");
