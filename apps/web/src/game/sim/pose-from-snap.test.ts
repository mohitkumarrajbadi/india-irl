import { applyPoseToDrive, poseFromSnap } from "./pose-from-snap.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const identity = poseFromSnap({
  id: 1,
  kind: 1,
  x: 10,
  y: 0.5,
  z: -3,
  qx: 0,
  qy: 0,
  qz: 0,
  qw: 1,
  speed: 4,
  flags: 0,
});
assert(identity.x === 10 && identity.z === -3, "xz");
assert(Math.abs(identity.yaw) < 1e-6, "yaw identity");
assert(identity.speed === 4, "speed");

const ds = { x: 0, z: 0, yaw: 0, speed: 0, roll: 0 };
applyPoseToDrive(ds, identity);
assert(ds.x === 10 && ds.speed === 4, "apply");

console.log("pose-from-snap.test.ts ok");
