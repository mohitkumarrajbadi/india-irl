import assert from "node:assert/strict";
import { spawnBand, spawnPlacementOk, spawnPlacementScore } from "./traffic-spawn.ts";

const urban = spawnBand(false);
assert.ok(urban.minD >= 70);
assert.ok(urban.minD > 40); // old 12–40 band must stay rejected

assert.equal(spawnPlacementOk(25, 0.9, -0.5, false), false); // near + ahead
assert.equal(spawnPlacementOk(100, 0.9, -0.5, false), false); // ahead converging
assert.equal(spawnPlacementOk(100, -0.5, 0.5, false), true); // behind + leaving
assert.equal(spawnPlacementOk(100, 0.35, 0.8, false), false); // forward cone rejected
assert.equal(spawnPlacementOk(100, 0.1, 0.8, false), true); // wide side + leaving

const good = spawnPlacementScore(100, -0.6, 0.7, false);
const bad = spawnPlacementScore(25, 0.95, -0.8, false);
assert.ok(good > bad);

console.log("traffic-spawn.test.ts ok");
