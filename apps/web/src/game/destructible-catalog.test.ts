import assert from "node:assert/strict";
import { EXTRA_DEFS, STALL_DEF, debrisCount } from "./destructible-catalog.ts";
import { DestructibleSim } from "./destructible-sim.ts";
import type { CityData } from "../world/types.ts";

assert.ok(STALL_DEF.hp > 10);
assert.ok(EXTRA_DEFS[0]);
assert.ok(debrisCount("scatter", 1) >= debrisCount("bend", 0));

const city = {
  stalls: [{ x: 0, z: 0, rot: 0, s: 1, v: 0 }],
  extras: [
    { x: 3, z: 0, rot: 0, s: 1, v: 0 },
    { x: 6, z: 0, rot: 0, s: 1, v: 3 }, // crane — not destructible
  ],
  lamps: [{ x: 9, z: 0, rot: 0 }],
  trees: [
    { x: 12, z: 0, s: 0.9, color: 1 },
    { x: 15, z: 0, s: 1.4, color: 1 }, // too big
  ],
  shrubs: [{ x: 18, z: 0, s: 1 }],
  circles: [{ x: 0, z: 0, r: 1 }],
} as CityData;

const sim = new DestructibleSim(city);
assert.ok(sim.entries.length >= 4);
assert.ok(!sim.entries.some((e) => e.source === "extra" && e.kind === 3));
assert.ok(!sim.entries.some((e) => e.source === "tree" && e.s > 1.15));

const hit = sim.hit(0.2, 0, 0, 14, 2, 0.9, 1200, 1000);
assert.ok(hit, "high-speed cab should smash stall");
assert.equal(hit!.material, "wood");
assert.ok(sim.entries.find((e) => e.source === "stall")?.state === "broken");

console.log("destructible-catalog.test.ts ok");
