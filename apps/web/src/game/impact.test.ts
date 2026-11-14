import assert from "node:assert/strict";
import {
  classifyPedHit,
  footTrafficDamage,
  isFootTrafficFatal,
  pedHitSeverity,
  pedThrowSpeed,
} from "./impact.ts";

assert.equal(classifyPedHit(3, 1200), "brush");
assert.equal(classifyPedHit(9, 140), "thrown");
assert.equal(classifyPedHit(15, 1200), "runover");
assert.ok(pedThrowSpeed(14, 1200) > pedThrowSpeed(14, 140));
assert.ok(pedHitSeverity("runover", 16) > pedHitSeverity("brush", 5));
assert.ok(footTrafficDamage(6, 140) < 12);
assert.ok(footTrafficDamage(14, 1200) > footTrafficDamage(8, 140));
assert.equal(isFootTrafficFatal(14, 1200, 50), false);
assert.equal(isFootTrafficFatal(18, 9000, 50), true);
assert.equal(isFootTrafficFatal(10, 1200, 0), true);
console.log("impact.test.ts ok");
