import assert from "node:assert/strict";
import { junctionAimPoint } from "./traffic-junction.ts";

// Far from junction — aim at entry.
const far = junctionAimPoint({
  x: 0,
  z: 0,
  tx: 0,
  tz: 20,
  t2x: 20,
  t2z: 20,
  toDist: 20,
});
assert.equal(far.x, 0);
assert.equal(far.z, 20);

// Mid-curve right turn — aim should leave the straight chord toward exit.
const mid = junctionAimPoint({
  x: 0,
  z: 12,
  tx: 0,
  tz: 20,
  t2x: 20,
  t2z: 20,
  toDist: 8,
  blendStart: 11,
});
assert.ok(mid.x > 2, `curve pulls right x=${mid.x}`);
assert.ok(mid.z > 18 && mid.z < 22);

// Near entry — more exit weight than naive half-lerp.
const near = junctionAimPoint({
  x: 0,
  z: 18,
  tx: 0,
  tz: 20,
  t2x: 20,
  t2z: 20,
  toDist: 2,
  blendStart: 11,
});
const halfLerpX = 0 + (20 - 0) * (1 - 2 / 11) * 0.5;
assert.ok(near.x > halfLerpX, `bezier deeper than half-blend (${near.x} > ${halfLerpX})`);

console.log("traffic-junction.test.ts ok");
