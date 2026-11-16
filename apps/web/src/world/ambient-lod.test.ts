import assert from "node:assert/strict";
import {
  REGION_LOD,
  ambientLodAt,
  isLocalAmbientBackdrop,
  regionDensity,
} from "./ambient-lod.ts";
import { CITIES } from "./cities.ts";
import { generateCity } from "./generate.ts";

assert.ok(regionDensity("village") < regionDensity("suburban"));
assert.ok(regionDensity("suburban") < regionDensity("urban"));
assert.ok(regionDensity("hills") <= regionDensity("village"));
assert.ok(REGION_LOD.village.trafficSyncMax < REGION_LOD.urban.trafficSyncMax);
assert.ok(REGION_LOD.hills.pedBubble < REGION_LOD.urban.pedBubble);

assert.equal(isLocalAmbientBackdrop("ped"), true);
assert.equal(isLocalAmbientBackdrop("animal"), true);
assert.equal(isLocalAmbientBackdrop("traffic"), false);

const city = generateCity(CITIES.novapura);
const spawn = ambientLodAt(city, city.spawn.x, city.spawn.z);
assert.ok(spawn.density >= 0.4, "spawn should feel urban/suburban, not hills");

const trail = city.trails.find((t) => t.kind === "village");
if (trail && trail.points.length > 4) {
  const p = trail.points[Math.floor(trail.points.length * 0.6)]!;
  const rural = ambientLodAt(city, p.x, p.z);
  assert.ok(rural.density <= 0.25, `village trail density=${rural.density}`);
  assert.ok(rural.pedBubble < spawn.pedBubble);
}

console.log("ambient-lod.test.ts ok");
