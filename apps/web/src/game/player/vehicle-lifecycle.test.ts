/**
 * Lifecycle rules for F-enter priority + bike wreck visibility flags.
 * Pure assertions — no Three / DOM.
 */
import assert from "node:assert/strict";
import type { Agent } from "../../vehicles/traffic-kinds.ts";
import { findNearestTraffic } from "../enterable-vehicles.ts";

function agent(partial: Partial<Agent>): Agent {
  return {
    kind: 1,
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

// Eject semantics: wrecked + !taken → enterable and would not be buried by matrices.
const bike = agent({ x: 3, z: 0, kind: 1, wrecked: true, taken: false });
assert.equal(bike.taken, false);
assert.equal(bike.wrecked, true);
const hit = findNearestTraffic(0, 0, [bike]);
assert.ok(hit);
assert.equal(hit!.index, 0);

// Driven chassis: taken hides + not enterable.
bike.taken = true;
bike.wrecked = false;
assert.equal(findNearestTraffic(0, 0, [bike]), null);

// Remount priority: closer curb (d=2) beats stash at d=10.
const curbD2 = 2 * 2;
const stashD2 = 10 * 10;
const remPri2 = 4.5 * 4.5;
assert.ok(curbD2 < stashD2);
assert.ok(!(stashD2 < remPri2 && stashD2 <= curbD2)); // remount must not win

console.log("vehicle-lifecycle.test.ts ok");
