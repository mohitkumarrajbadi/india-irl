import assert from "node:assert/strict";
import { trafficShouldTick, trafficTickLod } from "./traffic-tick-lod.ts";

assert.equal(trafficTickLod(10 * 10, 200), "full");
assert.equal(trafficTickLod(90 * 90, 200), "half");
assert.equal(trafficTickLod(160 * 160, 200), "quarter");

assert.equal(trafficShouldTick("full", 3, 0), true);
assert.equal(trafficShouldTick("half", 0, 0), true);
assert.equal(trafficShouldTick("half", 0, 1), false);
assert.equal(trafficShouldTick("half", 1, 1), true);
assert.equal(trafficShouldTick("quarter", 0, 0), true);
assert.equal(trafficShouldTick("quarter", 0, 1), false);

console.log("traffic-tick-lod.test.ts ok");
