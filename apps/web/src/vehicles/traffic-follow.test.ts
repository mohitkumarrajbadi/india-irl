import assert from "node:assert/strict";
import { followWant } from "./traffic-follow.ts";

const gap = 8;
const pad = 1.4;
const slow = followWant(gap, 8, 8, pad);
const closing = followWant(gap, 14, 4, pad);
assert.ok(closing < slow, `closing brakes harder (${closing} < ${slow})`);

const wreck = followWant(5, 12, 0, 2.4);
assert.ok(wreck < 4, `wreck ahead nearly stop want=${wreck}`);

console.log("traffic-follow.test.ts ok");
