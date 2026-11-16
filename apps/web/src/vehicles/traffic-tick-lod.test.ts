import assert from "node:assert/strict";
import { trafficShouldTick, trafficTickLod } from "./traffic-tick-lod.ts";

assert.equal(trafficTickLod(10 * 10, 200), "full");
assert.equal(trafficTickLod(120 * 120, 200), "half");

assert.equal(trafficShouldTick("full", 3, 0), true);
assert.equal(trafficShouldTick("half", 0, 0), true);
assert.equal(trafficShouldTick("half", 0, 1), false);
assert.equal(trafficShouldTick("half", 1, 1), true);

console.log("traffic-tick-lod.test.ts ok");
