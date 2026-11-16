import assert from "node:assert/strict";
import { REMOTE_INTERP_DELAY_MS, REMOTE_MAX_EXTRAPOLATE_MS } from "./defaults.ts";
import { sampleRemoteHermite } from "./sample-remote.ts";

assert.equal(REMOTE_INTERP_DELAY_MS, 110);
assert.equal(REMOTE_MAX_EXTRAPOLATE_MS, 160);

const snaps = [
  { t: 1000, x: 0, z: 0, yaw: 0, speed: 10 },
  { t: 1100, x: 0, z: 1, yaw: 0, speed: 10 },
];
const out = { x: 0, z: 0, yaw: 0, speed: 0 };

// Extrapolate past last snap — should clamp to MAX_EXTRAPOLATE_MS.
sampleRemoteHermite(snaps, 1100 + REMOTE_INTERP_DELAY_MS + 5000, out);
const maxZ = 1 + 10 * (REMOTE_MAX_EXTRAPOLATE_MS / 1000);
assert.ok(Math.abs(out.z - maxZ) < 0.05, `extrap clamp z=${out.z} want≈${maxZ}`);

// Render time behind delay → hold first snap.
sampleRemoteHermite(snaps, 1000 + REMOTE_INTERP_DELAY_MS - 50, out);
assert.equal(out.z, 0);

console.log("defaults.test.ts ok");
