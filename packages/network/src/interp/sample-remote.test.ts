import { sampleRemoteHermite } from "./sample-remote.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const snaps = [
  { t: 1000, x: 0, z: 0, yaw: 0, speed: 10 },
  { t: 1100, x: 0, z: 1, yaw: 0, speed: 10 },
];
const out = { x: 0, z: 0, yaw: 0, speed: 0 };
// render time = now - 110 → mid between snaps when now=1210 → rt=1100
sampleRemoteHermite(snaps, 1210, out);
assert(Math.abs(out.z - 1) < 0.15, `hermite near end z=${out.z}`);

sampleRemoteHermite(snaps, 1000, out);
assert(out.x === 0 && out.z === 0, "before first");

console.log("sample-remote.test.ts ok");
