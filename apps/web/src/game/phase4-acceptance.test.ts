/**
 * Phase 4 acceptance — regression locks for freeroam (no summon) + traffic spawn.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnPlacementOk } from "../vehicles/traffic-spawn.ts";
import { findNearestTraffic } from "./enterable-vehicles.ts";
import type { Agent } from "../vehicles/traffic-kinds.ts";

const here = dirname(fileURLToPath(import.meta.url));

// F / Digit paths must not summon vehicles.
const vehicleCmds = readFileSync(join(here, "player/vehicle-cmds.ts"), "utf8");
assert.ok(vehicleCmds.includes("no summon") || vehicleCmds.includes("never orphan-summon"));
assert.ok(vehicleCmds.includes("enterNearbyVehicle") || vehicleCmds.includes("findNearestEnterable"));
assert.ok(!/spawnVehicle|summonRide|bookRide/.test(vehicleCmds));

const keyDispatch = readFileSync(join(here, "player/key-dispatch.ts"), "utf8");
assert.ok(keyDispatch.includes("Digit1"));
assert.ok(keyDispatch.includes("cmds.emote"));
assert.ok(!/cmds\.vehicle\(.*Digit|spawn.*Digit/.test(keyDispatch));

// lastKind is write-only — must not be read for F enter.
assert.ok(!/s\.lastKind(?!\s*=)/.test(vehicleCmds.replace(/s\.lastKind\s*=/g, "")));

// Near-FOV spawn band stays rejected.
assert.equal(spawnPlacementOk(25, 0.9, -0.5, false), false);
assert.equal(spawnPlacementOk(100, -0.5, 0.6, false), true);

// Wrecked bike remains enterable.
const wreck: Agent = {
  kind: 1,
  tint: 0,
  x: 2,
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
  wrecked: true,
  blinker: 0,
  turnBlinker: 0,
  braking: false,
  laneTimer: 0,
  laneStrafe: 0,
  approachDir: 0,
  exitLane: 0,
  appearT: 0,
};
assert.ok(findNearestTraffic(0, 0, [wreck]));

console.log("phase4-acceptance.test.ts ok");
