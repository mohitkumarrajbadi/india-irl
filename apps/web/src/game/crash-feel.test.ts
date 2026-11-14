import assert from "node:assert/strict";
import {
  closingAlongNormal,
  glanceFactor,
  naturalBounce,
  softSpeedScrub,
} from "./crash-feel.ts";

assert.ok(Math.abs(softSpeedScrub(10, 0.3)) < 10);
assert.ok(softSpeedScrub(10, 0.3) > 0);

// Head-on into +Z wall while driving +Z → bounce back
const head = naturalBounce(12, 0, 0, -1, 0.7);
assert.ok(head.speed < 0, "head-on should reverse along yaw");

// Glancing: mostly sideways normal while driving forward
const glance = glanceFactor(10, 0, 1, 0);
assert.ok(glance > 0.7, "side scrape is glancing");
const deadOn = glanceFactor(10, 0, 0, -1);
assert.ok(deadOn < 0.2, "nose into wall is dead-on");

// Rear-end: both going +Z, contact normal along +Z from behind target
const rear = closingAlongNormal(14, 0, 8, 0, 0, -1);
assert.ok(rear > 0 && rear < 10, "rear-end closing is relative speed");
const headOn = closingAlongNormal(12, 0, -10, 0, 0, -1);
assert.ok(headOn > rear, "head-on closes faster than rear-end");

console.log("crash-feel.test.ts ok");
