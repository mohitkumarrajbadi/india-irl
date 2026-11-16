import assert from "node:assert/strict";
import { trafficYawStep } from "./traffic-yaw.ts";

const dt = 1 / 60;
const small = Math.abs(trafficYawStep(0.2, 10, 5.2, dt));
const large = Math.abs(trafficYawStep(1.4, 10, 5.2, dt));
// Large error uses lower gain — per-radian step should be smaller ratio
assert.ok(large / 1.4 < small / 0.2 + 0.01);

const capped = Math.abs(trafficYawStep(Math.PI, 2, 5.2, dt));
assert.ok(capped <= (Math.max(0.32, 2 / 5.2) * dt) + 1e-6);

console.log("traffic-yaw.test.ts ok");
