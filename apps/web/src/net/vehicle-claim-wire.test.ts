import assert from "node:assert/strict";
import {
  applyTrafficClaimFree,
  buildClaimMessage,
  packTrafficSpeed,
  unpackTrafficSpeed,
} from "./vehicle-claim-wire.ts";

const free = buildClaimMessage("t", 3, true);
assert.equal(free.free, 1);
assert.equal(free.w, undefined);

const wreck = buildClaimMessage("t", 3, true, { wreck: true, x: 10.26, z: -4.1, yaw: 1.234 });
assert.equal(wreck.w, 1);
assert.equal(wreck.x, 10.3);
assert.equal(wreck.z, -4.1);

const a = { taken: true, wrecked: false, speed: 8, x: 0, z: 0, yaw: 0, appearT: 0.5 };
applyTrafficClaimFree(a, wreck as unknown as Record<string, unknown>);
assert.equal(a.taken, false);
assert.equal(a.wrecked, true);
assert.equal(a.speed, 0);
assert.equal(a.x, 10.3);

const resume = { taken: true, wrecked: false, speed: 5, x: 1, z: 2, yaw: 0, appearT: 0 };
applyTrafficClaimFree(resume, free as unknown as Record<string, unknown>);
assert.equal(resume.wrecked, false);

assert.equal(packTrafficSpeed(8.26, false), 8.3);
assert.equal(packTrafficSpeed(8, true), -1);
assert.deepEqual(unpackTrafficSpeed(-1), { speed: 0, wrecked: true });
assert.deepEqual(unpackTrafficSpeed(4.5), { speed: 4.5, wrecked: false });

console.log("vehicle-claim-wire.test.ts ok");
