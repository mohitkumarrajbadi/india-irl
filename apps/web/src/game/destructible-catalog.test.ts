import assert from "node:assert/strict";
import {
  EXTRA_DEFS,
  MATERIAL_THRESHOLDS,
  STALL_DEF,
  classifyHit,
  debrisCount,
  hitSeverity,
  isSharedBreakSource,
} from "./destructible-catalog.ts";
import { DestructibleSim } from "./destructible-sim.ts";
import type { CityData } from "../world/types.ts";

assert.ok(STALL_DEF.hp > 10);
assert.ok(EXTRA_DEFS[0]);
assert.ok(debrisCount("scatter", 1) >= debrisCount("bend", 0));
assert.ok(MATERIAL_THRESHOLDS.metal.minSeverity > MATERIAL_THRESHOLDS.organic.minSeverity);
assert.equal(isSharedBreakSource("stall"), true);
assert.equal(isSharedBreakSource("shrub"), false);

assert.equal(classifyHit(0.02, 20, STALL_DEF), "ignore");
assert.equal(classifyHit(0.2, STALL_DEF.hp * 0.6, STALL_DEF), "damage");
assert.equal(classifyHit(0.7, STALL_DEF.hp * 0.6, STALL_DEF), "break");
assert.equal(classifyHit(0.2, 0, STALL_DEF), "break");

const soft = hitSeverity(4, 140, STALL_DEF);
const hard = hitSeverity(16, 1200, STALL_DEF);
assert.ok(hard > soft);

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

// Debris pool reclaim — fill then smash another prop
for (const d of sim.debris) {
  d.alive = true;
  d.life = 0.1;
  d.maxLife = 2;
}
const before = sim.debris.filter((d) => d.alive).length;
sim.applyRemoteBreak("lamp", 0, 2000);
assert.equal(sim.entries.find((e) => e.source === "lamp")?.state, "broken");
assert.equal(sim.debris.filter((d) => d.alive).length, before, "reclaim keeps pool size");

sim.applyRemoteRespawn("lamp", 0);
assert.equal(sim.entries.find((e) => e.source === "lamp")?.state, "ok");

console.log("destructible-catalog.test.ts ok");
