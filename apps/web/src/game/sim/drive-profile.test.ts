import assert from "node:assert/strict";
import {
  DRIVE_BUDGET,
  driveProfileSnap,
  noteDriveStep,
  percentile,
  resetDriveProfile,
} from "./drive-profile.ts";

resetDriveProfile();
assert.equal(percentile([], 0.95), 0);
assert.equal(percentile([1, 2, 3, 4, 5], 0.95), 5);
assert.equal(percentile([10, 20, 30, 40], 0.5), 20);

for (let i = 0; i < DRIVE_BUDGET.minSamples; i++) {
  noteDriveStep("rapier", 1.1, { chunks: 9, wantedRapier: true });
}
let snap = driveProfileSnap();
assert.equal(snap.authority, "rapier");
assert.ok(snap.passesBudget, "healthy Rapier should pass budget");
assert.ok(snap.meanMs > 1 && snap.meanMs < 1.3);
assert.equal(snap.chunks, 9);
assert.equal(snap.fallbackRate, 0);

resetDriveProfile();
for (let i = 0; i < DRIVE_BUDGET.minSamples; i++) {
  noteDriveStep("rapier", 4.5, { wantedRapier: true });
}
snap = driveProfileSnap();
assert.equal(snap.passesBudget, false, "slow Rapier must fail budget");

resetDriveProfile();
for (let i = 0; i < 50; i++) {
  noteDriveStep(i % 5 === 0 ? "fallback" : "rapier", 1.0, { wantedRapier: true });
}
snap = driveProfileSnap();
assert.ok(snap.fallbackRate >= 0.2);
assert.equal(snap.passesBudget, false, "high fallback fails budget");

resetDriveProfile();
console.log("drive-profile.test.ts ok");
