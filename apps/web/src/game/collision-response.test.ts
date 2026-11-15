import assert from "node:assert/strict";
import {
  classifyHitZone,
  resolveVehicleCollision,
  shouldEjectCabinBody,
  shouldSeparateRider,
} from "./collision-response.ts";
import { PLAYER_PHYSICS, TRAFFIC_PHYSICS } from "../vehicles/physics-props.ts";

// Push-out normals point away from the other body (out of overlap).
assert.equal(classifyHitZone(0, 0, -1), "front"); // hit something ahead → pushed back
assert.equal(classifyHitZone(0, 0, 1), "rear");
assert.equal(classifyHitZone(0, 1, 0), "side");

const bike = PLAYER_PHYSICS[2];
const auto = PLAYER_PHYSICS[1];
const cab = PLAYER_PHYSICS[3];
const bus = TRAFFIC_PHYSICS[3];

// Motorcycle head-on into bus — bike takes the pain, separates.
const bikeVsBus = resolveVehicleCollision({
  self: bike,
  other: bus,
  selfSpeed: 16,
  selfYaw: 0,
  otherSpeed: 8,
  otherYaw: Math.PI,
  nx: 0,
  nz: -1,
});
assert.ok(bikeVsBus.closing > 20, `closing ${bikeVsBus.closing}`);
assert.ok(bikeVsBus.selfSev > 0.55, `bike sev ${bikeVsBus.selfSev}`);
assert.ok(bikeVsBus.selfSev > bikeVsBus.otherSev, "bike absorbs more than bus");
assert.ok(shouldSeparateRider(bike, bus.mass, bikeVsBus.selfSev, bikeVsBus.closing));

// Cab into stationary auto — lighter auto suffers more in reverse matchup.
const cabVsAuto = resolveVehicleCollision({
  self: cab,
  other: auto,
  selfSpeed: 14,
  selfYaw: 0,
  otherSpeed: 0,
  otherYaw: 0,
  nx: 0,
  nz: -1,
});
const autoVsCab = resolveVehicleCollision({
  self: auto,
  other: cab,
  selfSpeed: 14,
  selfYaw: 0,
  otherSpeed: 0,
  otherYaw: 0,
  nx: 0,
  nz: -1,
});
assert.ok(autoVsCab.selfSev > cabVsAuto.selfSev, "lighter auto suffers more vs cab");

// Side hit spins a bike.
const bikeSide = resolveVehicleCollision({
  self: bike,
  other: cab,
  selfSpeed: 12,
  selfYaw: 0,
  otherSpeed: 10,
  otherYaw: Math.PI / 2,
  nx: 1,
  nz: 0,
});
assert.equal(bikeSide.zone, "side");
assert.ok(Math.abs(bikeSide.selfYawKick) > 0.02, "side hit yaw kick");

assert.equal(shouldSeparateRider(cab, bus.mass, 0.8, 12), false);
assert.ok(shouldEjectCabinBody(auto, bus.mass, 0.95));
assert.equal(shouldEjectCabinBody(cab, auto.mass, 0.7), false);

console.log("collision-response.test.ts ok");
