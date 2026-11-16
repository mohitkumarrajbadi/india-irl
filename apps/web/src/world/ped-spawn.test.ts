import assert from "node:assert/strict";
import { pedSpawnBand, pedSpawnOffset, pedSpawnPlacementOk } from "./ped-spawn.ts";

const band = pedSpawnBand(220, 100);
assert.ok(band.minD >= 28);
assert.ok(band.maxD > band.minD);

assert.equal(pedSpawnPlacementOk(20, -0.5, 220, 100), false); // too near
assert.equal(pedSpawnPlacementOk(120, 0.9, 220, 100), false); // ahead
assert.equal(pedSpawnPlacementOk(120, -0.4, 220, 100), true);

let n = 0;
const rng = () => {
  n += 1;
  return (n * 0.17) % 1;
};
const off = pedSpawnOffset(rng, 0, 0, 0, 220, 100, 12);
const d = Math.hypot(off.x, off.z);
assert.ok(d >= band.minD * 0.8);
// Prefer behind when yaw=0 (forward +Z): z should tend negative
assert.ok(off.z < 20);

console.log("ped-spawn.test.ts ok");
