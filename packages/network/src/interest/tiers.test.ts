import assert from "node:assert/strict";
import {
  INTEREST_MID_M,
  INTEREST_NEAR_M,
  INTEREST_TIERS,
  lodTier,
} from "./tiers.ts";

assert.equal(INTEREST_NEAR_M, 90);
assert.equal(INTEREST_MID_M, 200);
assert.equal(INTEREST_TIERS.midGapMs, 220);
assert.equal(INTEREST_TIERS.farGapMs, 1100);

assert.equal(lodTier(0, 400), "near");
assert.equal(lodTier(INTEREST_NEAR_M * INTEREST_NEAR_M + 1, 400), "mid");
assert.equal(lodTier(INTEREST_MID_M * INTEREST_MID_M + 1, 400), "far");
assert.equal(lodTier(500 * 500, 400), "culled");

console.log("tiers.test.ts ok");
