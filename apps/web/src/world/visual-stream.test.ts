import { activeCellKeys, streamRingForSpeed } from "./visual-stream.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(streamRingForSpeed(0) === 1, "idle ring");
assert(streamRingForSpeed(30) === 3, "highway ring");
const keys = activeCellKeys(100, 100, 1);
assert(keys.size === 9, "3x3 neighborhood");
assert(keys.has("1,1"), "contains cell");

console.log("visual-stream.test.ts ok");
