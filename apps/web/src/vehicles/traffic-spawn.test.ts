import assert from "node:assert/strict";
import { spawnBand, spawnPlacementOk, spawnPlacementScore } from "./traffic-spawn.ts";

const urban = spawnBand(false);
assert.ok(urban.minD >= 20);
assert.ok(urban.minD < 40);
assert.ok(urban.maxD > 100);

assert.equal(spawnPlacementOk(25, 0.9, -0.5, false), false); // near + ahead
assert.equal(spawnPlacementOk(100, 0.9, -0.5, false), true); // far ahead OK for density
assert.equal(spawnPlacementOk(100, -0.5, 0.5, false), true); // behind + leaving
assert.equal(spawnPlacementOk(30, 0.7, 0.8, false), false); // close forward cone rejected
assert.equal(spawnPlacementOk(80, 0.1, 0.8, false), true); // wide side + leaving

const good = spawnPlacementScore(70, -0.2, 0.5, false);
const bad = spawnPlacementScore(25, 0.95, -0.8, false);
assert.ok(good > bad);

console.log("traffic-spawn.test.ts ok");
