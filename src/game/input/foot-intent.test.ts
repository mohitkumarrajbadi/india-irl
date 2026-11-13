import { simInputFromFootAxes } from "./foot-intent.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const idle = simInputFromFootAxes({
  forward: 0,
  strafe: 0,
  camYaw: 0,
  facing: 1.2,
  sprint: false,
  jump: false,
  stunned: false,
});
assert(idle.moveX === 0 && idle.moveZ === 0, "idle");
assert(idle.yaw === 1.2, "keep facing");

const fwd = simInputFromFootAxes({
  forward: 1,
  strafe: 0,
  camYaw: 0,
  facing: 0,
  sprint: true,
  jump: false,
  stunned: false,
});
assert(Math.abs(fwd.moveZ - 1) < 1e-6 && Math.abs(fwd.moveX) < 1e-6, "forward +Z");
assert(fwd.sprint === true, "sprint");

const stun = simInputFromFootAxes({
  forward: 1,
  strafe: 1,
  camYaw: 0,
  facing: 0,
  sprint: true,
  jump: true,
  stunned: true,
});
assert(stun.moveX === 0 && stun.jump === false, "stunned locks");

console.log("foot-intent.test.ts ok");
