import assert from "node:assert/strict";
import { novapura } from "./city-novapura.ts";
import { generateCity } from "./generate.ts";
import { isRuralAt, sampleTerrain } from "./terrain-sample.ts";
import { nearestTrail, onTrailRoad } from "./trail-query.ts";

const city = generateCity(novapura);
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
assert.ok(city.flyovers.length >= 1, "flyover expected");
const fo = city.flyovers[0]!;
const midZ = (fo.z0 + fo.z1) * 0.5;
const under = sampleTerrain(city, fo.x, midZ, 0);
assert.ok(under.y < 1.5, `under flyover should be ground, y=${under.y}`);
const onDeck = sampleTerrain(city, fo.x, midZ, fo.deckY);
assert.ok(onDeck.y >= fo.deckY * 0.9, `on deck with yHint, y=${onDeck.y}`);
const rampZ = fo.z0 + 10;
const ramp = sampleTerrain(city, fo.x, rampZ);
assert.ok(ramp.y > 1 && ramp.y < fo.deckY + 0.5, `ramp elevates, y=${ramp.y}`);

assert.ok(city.underpasses.length >= 1, "underpass expected");
const up = city.underpasses[0]!;
const trough = sampleTerrain(city, (up.a0 + up.a1) * 0.5, up.c);
assert.ok(trough.y <= up.floorY + 0.2, `underpass trough y=${trough.y}`);
assert.ok(city.villages.length >= 1, "village settlement expected");

// Hill guardrails leave AABB rail segments in the collide set
const hillBoxes = city.boxes.filter((b) => (b.h ?? 0) > 0.5 && (b.h ?? 0) < 1.2);
assert.ok(hillBoxes.length >= 8, `expected hill rail boxes, got ${hillBoxes.length}`);

console.log("trail-roads.test.ts ok");
