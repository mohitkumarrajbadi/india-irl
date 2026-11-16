import assert from "node:assert/strict";
import { tyreGripMul } from "./tyre-grip.ts";

assert.equal(tyreGripMul(1, 1), 1);
assert.ok(tyreGripMul(1, 0.55) < 0.7);
assert.ok(tyreGripMul(0.7, 0.55) < tyreGripMul(1, 0.55));
assert.equal(tyreGripMul(0, 1), 0.35);
assert.equal(tyreGripMul(2, 1), 1.2);

console.log("tyre-grip.test.ts ok");
