import assert from "node:assert/strict";
import { healthDriveScale } from "./health-drive.ts";

const full = healthDriveScale(1);
assert.ok(Math.abs(full.force - 1) < 1e-6);
assert.ok(Math.abs(full.grip - 1) < 1e-6);

const half = healthDriveScale(0.5);
assert.ok(Math.abs(half.force - 0.775) < 1e-6);

const zero = healthDriveScale(0);
assert.ok(Math.abs(zero.force - (0.55 + 0.25 * 0.45)) < 1e-6);

console.log("health-drive.test.ts ok");
