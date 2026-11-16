import assert from "node:assert/strict";
import {
  GARAGE_PAINTS,
  garageTopColor,
  unlockedAccBits,
  unlockedPaints,
} from "./cosmetics.ts";

assert.ok(unlockedPaints(1).length >= 1);
assert.ok(unlockedPaints(8).length >= unlockedPaints(2).length);
assert.ok(unlockedAccBits(6) > unlockedAccBits(1));
assert.equal(GARAGE_PAINTS[0]!.level, 1);

const tint = garageTopColor(99);
assert.ok(typeof tint === "number");

console.log("cosmetics.test.ts ok");
