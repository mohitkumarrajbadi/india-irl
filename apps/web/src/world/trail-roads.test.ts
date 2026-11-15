import assert from "node:assert/strict";
import { bengaluru } from "./city-bengaluru.ts";
import { generateCity } from "./generate.ts";
import { isRuralAt, sampleTerrain } from "./terrain-sample.ts";
import { nearestTrail, onTrailRoad } from "./trail-query.ts";

const city = generateCity(bengaluru);
assert.ok(city.trails.length >= 2, `expected trails, got ${city.trails.length}`);
const villages = city.trails.filter((t) => t.kind === "village");
const hills = city.trails.filter((t) => t.kind === "hill");
assert.ok(villages.length >= 1);
assert.ok(hills.length >= 1);

const hill = hills[0]!;
const mid = hill.points[Math.floor(hill.points.length * 0.55)]!;
const hit = onTrailRoad(city, mid.x, mid.z);
assert.ok(hit, "should be on hill road");
assert.equal(hit!.trail.kind, "hill");
assert.ok(isRuralAt(city, mid.x, mid.z));

const sample = sampleTerrain(city, mid.x, mid.z);
assert.equal(sample.region, "hills");
assert.equal(sample.surface, "asphalt");
assert.ok(sample.y > 0.5, `hill road should be elevated, y=${sample.y}`);
assert.ok(Math.hypot(sample.gradX, sample.gradZ) >= 0);

const village = villages[0]!;
assert.ok(village.half <= 2.1, "village single-carriageway");
const vp = village.points[Math.floor(village.points.length * 0.6)]!;
const vHit = nearestTrail(city, vp.x, vp.z, 8);
assert.ok(vHit && vHit.trail.kind === "village");
assert.ok(city.stalls.length > 0 || city.cows.length > 0);
assert.ok(city.flyover, "flyover expected");
const fo = city.flyover!;
const under = sampleTerrain(city, fo.x, (fo.z0 + fo.z1) * 0.5);
// On deck when centered
assert.ok(under.y >= fo.deckY * 0.9, `flyover deck y=${under.y}`);

console.log("trail-roads.test.ts ok");
