import { clamp, quatFromYaw, yawVec } from "./math3.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(clamp(5, 0, 3) === 3, "clamp high");
assert(clamp(-1, 0, 3) === 0, "clamp low");
assert(clamp(1, 0, 3) === 1, "clamp mid");

const q = quatFromYaw(Math.PI);
assert(Math.abs(q.w) < 1e-6 && Math.abs(q.y - 1) < 1e-6, "quatFromYaw pi");

const v = yawVec({ x: 0, y: 0, z: 1 }, Math.PI / 2);
assert(Math.abs(v.x - 1) < 1e-6 && Math.abs(v.z) < 1e-6, "yawVec +90");

console.log("math3.test.ts ok");
