import assert from "node:assert/strict";
import { blinkerForTurn, turnBetween, type Agent } from "./traffic-kinds.ts";
import { forwardBlocked, pickLaneChange, sideClear } from "./traffic-lane.ts";
import { tickBlinkerCancel } from "../game/player/blinker-cancel.ts";
import type { PlayerState } from "../game/player/types.ts";

assert.equal(turnBetween(0, 0), 0);
assert.equal(turnBetween(0, 1), 1);
assert.equal(turnBetween(0, 3), 3);
assert.equal(turnBetween(1, 0), 3);
assert.equal(blinkerForTurn(0), 0);
assert.equal(blinkerForTurn(1), 1);
assert.equal(blinkerForTurn(3), -1);
assert.equal(blinkerForTurn(2), -1);

function stubAgent(partial: Partial<Agent>): Agent {
  return {
    kind: 2,
    tint: 0,
    x: 0,
    z: 0,
    yaw: 0,
    speed: 8,
    tx: 0,
    tz: 20,
    t2x: 0,
    t2z: 40,
    stage: 0,
    ni: 1,
    nj: 1,
    dir: 0,
    lane: 0,
    top: 12,
    stuck: 0,
    ghost: 0,
    kbX: 0,
    kbZ: 0,
    spin: 0,
    taken: false,
    blinker: 0,
    turnBlinker: 0,
    braking: false,
    laneTimer: 0,
    laneStrafe: 0,
    approachDir: 0,
    ...partial,
  };
}

const self = stubAgent({ x: 0, z: 0, yaw: 0, speed: 8 });
const ahead = stubAgent({ x: 0, z: 5, yaw: 0, speed: 1, kind: 2 });
assert.equal(forwardBlocked(self, [self, ahead], 0, [], 12), true);
assert.equal(forwardBlocked(self, [self], 0, [], 12), false);
assert.equal(forwardBlocked(self, [self], 0, [{ x: 0, z: 4, r: 1.2 }], 12), true);

assert.equal(sideClear(self, [self, stubAgent({ x: 2.2, z: 2, yaw: 0 })], 0, 1), false);
assert.equal(sideClear(self, [self, stubAgent({ x: -2.2, z: 2, yaw: 0 })], 0, 1), true);

const city = {
  roadsX: [{ lanes: [-1.75, 1.75], half: 4 }],
  roadsZ: [{ lanes: [-1.75, 1.75], half: 4 }],
} as Parameters<typeof pickLaneChange>[0];
const blocked = stubAgent({ x: 0, z: 0, yaw: 0, speed: 8, lane: 0, approachDir: 0, dir: 0, ni: 0, nj: 1 });
const blocker = stubAgent({ x: 0, z: 4, yaw: 0, speed: 0 });
const change = pickLaneChange(city, blocked, [blocked, blocker], 0, []);
assert.ok(change);
assert.equal(change!.blinker, 1); // prefer right overtake
assert.equal(change!.lane, 1);

const ps = {
  blinker: -1 as const,
  blinkerArmed: false,
  ds: { steer: 0 },
} as PlayerState;
tickBlinkerCancel(ps);
assert.equal(ps.blinker, -1);
ps.ds.steer = 0.6;
tickBlinkerCancel(ps);
assert.equal(ps.blinkerArmed, true);
ps.ds.steer = 0.05;
tickBlinkerCancel(ps);
assert.equal(ps.blinker, 0);

console.log("traffic-ai.test.ts ok");
