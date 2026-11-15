import assert from "node:assert/strict";
import { findNearestEnterable, findNearestTraffic, trafficKindToVehicle } from "./enterable-vehicles.ts";
import type { Agent } from "../vehicles/traffic-kinds.ts";
import type { CityData } from "../world/types.ts";

assert.equal(trafficKindToVehicle(0), 1);
assert.equal(trafficKindToVehicle(1), 2);
assert.equal(trafficKindToVehicle(2), 3);
assert.equal(trafficKindToVehicle(3), 3);
assert.equal(trafficKindToVehicle(4), 3);

const agents: Agent[] = [
  {
    kind: 2,
    tint: 0,
    x: 2,
    z: 0,
    yaw: 0.4,
    speed: 1,
    tx: 0,
    tz: 0,
    t2x: 0,
    t2z: 0,
    stage: 0,
    ni: 0,
    nj: 0,
    dir: 0,
    lane: 0,
    top: 10,
    stuck: 0,
    ghost: 0,
    kbX: 0,
    kbZ: 0,
    spin: 0,
    taken: false,
  },
  {
    kind: 1,
    tint: 0,
    x: 50,
    z: 50,
    yaw: 0,
    speed: 8,
    tx: 0,
    tz: 0,
    t2x: 0,
    t2z: 0,
    stage: 0,
    ni: 0,
    nj: 0,
    dir: 0,
    lane: 0,
    top: 10,
    stuck: 0,
    ghost: 0,
    kbX: 0,
    kbZ: 0,
    spin: 0,
    taken: false,
  },
];

const hit = findNearestTraffic(0, 0, agents);
assert.ok(hit);
assert.equal(hit!.source, "traffic");
assert.equal(hit!.index, 0);
assert.equal(hit!.kind, 3);

agents[0]!.taken = true;
assert.equal(findNearestTraffic(0, 0, agents), null);

const city = {
  parked: [{ x: 1, z: 0, rot: 0, s: 1, v: 0, kind: 1 as const }],
} as CityData;
agents[0]!.taken = false;
const either = findNearestEnterable(0, 0, city, agents);
assert.ok(either);

console.log("enterable-vehicles.test.ts ok");
