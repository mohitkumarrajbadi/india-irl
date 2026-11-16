import assert from "node:assert/strict";
import { exitFootPose } from "./exit-pose.ts";

const CAB_W = 1.75;

// Clear space — prefers driver (right) flank
const clear = exitFootPose({ x: 0, z: 0, yaw: 0 }, CAB_W, {
  resolve: (x, z, _r, out) => {
    out.x = x;
    out.z = z;
  },
});
assert.ok(clear.x > 0, "yaw=0 right flank should be +X");
assert.equal(clear.z, 0);

// Right blocked (pushed far), left free → pick left
const blockedRight = exitFootPose({ x: 0, z: 0, yaw: 0 }, CAB_W, {
  resolve: (x, z, _r, out) => {
    if (x > 0) {
      out.x = x + 2;
      out.z = z;
    } else {
      out.x = x;
      out.z = z;
    }
  },
});
assert.ok(blockedRight.x < 0, "should exit left when right is blocked");

const bare = exitFootPose({ x: 10, z: 5, yaw: Math.PI / 2 }, 0.7, null);
assert.ok(Math.abs(bare.z - (5 - (0.7 / 2 + 0.7))) < 1e-6 || Math.abs(bare.x - 10) < 1e-6);

console.log("exit-pose.test.ts ok");
