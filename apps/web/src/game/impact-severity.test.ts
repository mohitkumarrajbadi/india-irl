import assert from "node:assert/strict";
import { severityFromClosing, severityFromRapierImpact } from "./impact-severity.ts";

const soft = severityFromRapierImpact(3, 6, 1, 0);
assert.ok(soft.sev < 0.25, `soft hit should be mild, sev=${soft.sev}`);

const hardBike = severityFromRapierImpact(2, 22, 0.2, 0.9);
assert.ok(hardBike.sev > 0.5, `bike hard impact should separate, sev=${hardBike.sev}`);
assert.equal(hardBike.closing, 22);
assert.ok(Math.abs(Math.hypot(hardBike.nx, hardBike.nz) - 1) < 1e-5);

const bikeVsWall = severityFromClosing(16, 140, 50_000, 0);
const cabVsWall = severityFromClosing(16, 1200, 50_000, 0);
assert.ok(bikeVsWall > cabVsWall, "light bike takes harder share vs world");

console.log("impact-severity.test.ts ok");
