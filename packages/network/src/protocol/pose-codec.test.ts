import { POSE_BYTES, decodePose, encodePose } from "./pose-codec.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const pose = {
  x: 12.5,
  z: -3.25,
  yaw: 1.1,
  speed: -2.5,
  veh: 1,
  seat: 0,
  emote: 2,
  rideWith: "abc123" as string | null,
};

const buf = encodePose(pose);
assert(buf.length === POSE_BYTES, "size");
const back = decodePose(buf);
assert(back !== null, "decode");
assert(Math.abs(back!.x - 12.5) < 1e-5 && Math.abs(back!.z + 3.25) < 1e-5, "xz");
assert(back!.veh === 1 && back!.emote === 2, "meta");
assert(back!.rideWith === "abc123", "ride");

const none = encodePose({ ...pose, rideWith: null });
assert(decodePose(none)!.rideWith === null, "no ride");

console.log("pose-codec.test.ts ok");
