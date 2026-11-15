import assert from "node:assert/strict";
import { findNearestWorldParked, worldKindToVehicle } from "./world-vehicles.ts";
import type { CityData } from "../world/types.ts";

assert.equal(worldKindToVehicle(0), 2);
assert.equal(worldKindToVehicle(1), 1);
assert.equal(worldKindToVehicle(2), 3);

const city = {
  parked: [
    { x: 10, z: 0, rot: 0.5, s: 1, v: 0, kind: 0 as const },
    { x: 0, z: 0, rot: 1.2, s: 1, v: 0, kind: 1 as const },
    { x: 100, z: 100, rot: 0, s: 1, v: 0, kind: 2 as const },
  ],
} as CityData;

const near = findNearestWorldParked(0.5, 0.5, city);
assert.ok(near);
assert.equal(near!.index, 1);
assert.equal(near!.kind, 1);

const far = findNearestWorldParked(80, 80, city);
assert.equal(far, null);

console.log("world-vehicles.test.ts ok");
