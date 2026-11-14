import assert from "node:assert/strict";
import {
  crashDamage,
  crashSeverity,
  isFatalCrash,
  massHitScale,
  massWallSeverity,
  shouldEjectBike,
  shouldEjectCabin,
  vehicleHitSeverity,
  wallCrashSeverity,
} from "./crash.ts";

assert.equal(crashSeverity(3), 0);
assert.ok(crashSeverity(26) > 0.9);
assert.equal(crashDamage(0.1), 0);
assert.ok(crashDamage(0.5) < 18);
assert.ok(crashDamage(0.95) < 50);
assert.ok(shouldEjectBike(0.56, 2));
assert.equal(shouldEjectBike(0.4, 2), false);
assert.equal(shouldEjectCabin(0.8, 3), false);
assert.ok(shouldEjectCabin(0.92, 3));
assert.ok(isFatalCrash(0.97, 19));
assert.equal(isFatalCrash(0.9, 14), false);
assert.ok(wallCrashSeverity(0.25, 18) > 0.25);

assert.ok(Math.abs(massHitScale(1200, 1200) - 0.5) < 1e-6);
assert.ok(massHitScale(140, 7000) > 0.9);
assert.ok(massHitScale(7000, 140) < 0.1);

const cabVsCab = vehicleHitSeverity(16, 1200, 1200, 0);
const cabGlance = vehicleHitSeverity(16, 1200, 1200, 0.85);
const bikeVsCab = vehicleHitSeverity(16, 140, 1200, 0);
const cabVsBike = vehicleHitSeverity(16, 1200, 140, 0);
assert.ok(cabGlance < cabVsCab * 0.55, "glance much softer");
assert.ok(bikeVsCab > cabVsCab);
assert.ok(cabVsBike < cabVsCab);
assert.ok(cabVsCab < 0.9);

const bikeWall = massWallSeverity(0.5, 140);
const cabWall = massWallSeverity(0.5, 1200);
assert.ok(bikeWall > cabWall);
console.log("crash.test.ts ok");
