import assert from "node:assert/strict";
import { appendCrossingPedObstacles, pedYieldObstacle } from "./traffic-ped-yield.ts";

assert.equal(pedYieldObstacle({ intent: "patrol", x: 0, z: 0 }), null);
const o = pedYieldObstacle({ intent: "cross", x: 3, z: 4 });
assert.ok(o);
assert.equal(o!.r, 0.55);

const out: { x: number; z: number; r: number }[] = [];
appendCrossingPedObstacles(
  out,
  [
    { intent: "cross", x: 10, z: 0 },
    { intent: "patrol", x: 5, z: 0 },
    { intent: "cross", x: 200, z: 0 },
  ],
  0,
  0,
  55,
);
assert.equal(out.length, 1);
assert.equal(out[0]!.x, 10);

console.log("traffic-ped-yield.test.ts ok");
