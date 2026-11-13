/** ENTER / EXIT / authority / impulse / remote pose commands. */
import type { MainToSim } from "./protocol.ts";
import { quatFromYaw } from "./math3.ts";
import type { WorkerRuntime } from "./sim-types.ts";

export function syncLocal(
  rt: WorkerRuntime,
  id: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
): void {
  const ch = rt.stores.chars.get(id);
  if (!ch) return;
  ch.yaw = yaw;
  ch.ragdoll = false;
  ch.body.setNextKinematicTranslation({ x, y, z });
  ch.body.setNextKinematicRotation(quatFromYaw(yaw));
}

export function syncVehicle(
  rt: WorkerRuntime,
  id: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
): void {
  const v = rt.stores.vehicles.get(id);
  if (!v) return;
  const body = v.controller.body;
  body.setTranslation({ x, y, z }, true);
  body.setRotation(quatFromYaw(yaw), true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

export function enterVehicle(rt: WorkerRuntime, vehicleId: number, seat: number): void {
  const ch = rt.stores.chars.get(rt.stores.localId);
  if (!ch || !rt.stores.vehicles.has(vehicleId)) return;
  ch.vehicleId = vehicleId;
  ch.seat = seat;
  rt.stores.drivingVehicleId = seat === 0 ? vehicleId : 0;
  const v = rt.stores.vehicles.get(vehicleId);
  if (v && seat === 0) v.controller.authority = true;
  rt.post({
    type: "EVENT",
    event: { type: "SEATED", entityId: rt.stores.localId, vehicleId, seat },
  });
}

export function exitVehicle(rt: WorkerRuntime): void {
  const ch = rt.stores.chars.get(rt.stores.localId);
  if (ch) {
    ch.vehicleId = 0;
    ch.seat = 0;
    ch.ragdoll = false;
  }
  rt.stores.drivingVehicleId = 0;
}

export function applyImpulse(
  rt: WorkerRuntime,
  entityId: number,
  ix: number,
  iy: number,
  iz: number,
): void {
  rt.stores.chars.get(entityId)?.body.applyImpulse({ x: ix, y: iy, z: iz }, true);
  rt.stores.vehicles.get(entityId)?.controller.body.applyImpulse({ x: ix, y: iy, z: iz }, true);
}

export function mirrorPose(
  rt: WorkerRuntime,
  msg: Extract<MainToSim, { type: "NET_REMOTE_POSE" }>,
): void {
  if (!msg.kinematic || !rt.rapier) return;
  const v = rt.stores.vehicles.get(msg.entityId);
  if (v) {
    v.controller.authority = false;
    v.controller.body.setBodyType(rt.rapier.RigidBodyType.KinematicPositionBased, true);
    v.controller.body.setNextKinematicTranslation({ x: msg.x, y: msg.y, z: msg.z });
    v.controller.body.setNextKinematicRotation({ x: msg.qx, y: msg.qy, z: msg.qz, w: msg.qw });
  }
  const ch = rt.stores.chars.get(msg.entityId);
  if (ch) {
    ch.body.setNextKinematicTranslation({ x: msg.x, y: msg.y, z: msg.z });
    ch.body.setNextKinematicRotation({ x: msg.qx, y: msg.qy, z: msg.qz, w: msg.qw });
  }
}

export function disposeRuntime(rt: WorkerRuntime): void {
  cancelAnimationFrame(rt.loop.raf);
  rt.world?.free();
  rt.world = null;
  rt.stores.chars.clear();
  rt.stores.vehicles.clear();
  rt.stores.chunks.clear();
  rt.ready = false;
}
