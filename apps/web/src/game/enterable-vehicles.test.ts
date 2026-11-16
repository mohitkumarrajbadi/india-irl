import assert from "node:assert/strict";
import { findNearestEnterable, findNearestTraffic, trafficKindToVehicle } from "./enterable-vehicles.ts";
import type { Agent } from "../vehicles/traffic-kinds.ts";
import type { CityData } from "../world/types.ts";

assert.equal(trafficKindToVehicle(0), 1);
assert.equal(trafficKindToVehicle(1), 2);
assert.equal(trafficKindToVehicle(2), 3);
assert.equal(trafficKindToVehicle(3), 3);
assert.equal(trafficKindToVehicle(4), 3);

function agent(partial: Partial<Agent>): Agent {
  return {
    kind: 2,
    tint: 0,
    x: 0,
    z: 0,
    yaw: 0,
    speed: 0,
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
    wrecked: false,
    blinker: 0,
    turnBlinker: 0,
    braking: false,
    laneTimer: 0,
    laneStrafe: 0,
    approachDir: 0,
    exitLane: 0,
    appearT: 0,
    ...partial,
  };
}

const agents: Agent[] = [
  agent({ kind: 2, x: 2, z: 0, yaw: 0.4, speed: 1 }),
  agent({ kind: 1, x: 50, z: 50, yaw: 0, speed: 8 }),
];

const hit = findNearestTraffic(0, 0, agents);
assert.ok(hit);
assert.equal(hit!.source, "traffic");
assert.equal(hit!.index, 0);
assert.equal(hit!.kind, 3);

agents[0]!.taken = true;
assert.equal(findNearestTraffic(0, 0, agents), null);

// Wrecked bike remains enterable (not taken).
agents[0]!.taken = false;
agents[0]!.wrecked = true;
agents[0]!.kind = 1;
const wreck = findNearestTraffic(0, 0, agents);
assert.ok(wreck);
assert.equal(wreck!.index, 0);
assert.equal(wreck!.kind, 2);

const city = {
  parked: [{ x: 1, z: 0, rot: 0, s: 1, v: 0, kind: 1 as const }],
} as CityData;
agents[0]!.wrecked = false;
agents[0]!.kind = 2;
const either = findNearestEnterable(0, 0, city, agents);
assert.ok(either);

console.log("enterable-vehicles.test.ts ok");
