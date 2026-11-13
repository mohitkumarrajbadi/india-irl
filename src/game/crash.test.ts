import assert from "node:assert/strict";
import {
  bounceSpeed,
  crashDamage,
  crashSeverity,
  isFatalCrash,
  shouldEjectBike,
  wallCrashSeverity,
} from "./crash.ts";

assert.equal(crashSeverity(3), 0);
assert.ok(crashSeverity(22) >= 0.99);
assert.equal(crashDamage(0.1), 0);
assert.ok(crashDamage(0.9) > 40);
assert.ok(shouldEjectBike(0.5, 2));
assert.equal(shouldEjectBike(0.9, 1), false);
assert.ok(isFatalCrash(0.95, 14));
assert.equal(isFatalCrash(0.95, 5), false);
assert.ok(bounceSpeed(16, 0.8) < 0);
assert.ok(wallCrashSeverity(0.2, 18) > 0.4);
console.log("crash.test.ts ok");
