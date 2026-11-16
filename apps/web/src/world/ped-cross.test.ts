import assert from "node:assert/strict";
import { dirFromVec, nearestJunctionIndex, pedCrossShouldWait } from "./ped-cross.ts";
import { signalPhase } from "./signals.ts";

assert.equal(dirFromVec(0, 1), 0);
assert.equal(dirFromVec(1, 0), 1);
assert.equal(dirFromVec(0, -1), 2);
assert.equal(dirFromVec(-1, 0), 3);

const xs = [0, 40];
const zs = [0, 40];
const j = nearestJunctionIndex(xs, zs, 2, 3);
assert.equal(j.ni, 0);
assert.equal(j.nj, 0);

// Find a time when approach dir 1 is green at (0,0).
let greenT = 0;
for (let t = 0; t < 20; t += 0.25) {
  if (signalPhase(0, 0, 1, t) === "green") {
    greenT = t;
    break;
  }
}
// Cross along +Z → road along ±X → dir 1 or 3; pick +X carriageway wait.
const wait = pedCrossShouldWait(1, 1, 1, 12, xs, zs, greenT);
assert.equal(typeof wait, "boolean");

// Far from any junction — never wait.
assert.equal(pedCrossShouldWait(500, 500, 500, 510, xs, zs, greenT), false);

console.log("ped-cross.test.ts ok");
