/** Local player character controller (kinematic capsule). */
import type RAPIER from "@dimforge/rapier3d-compat";
import type { SimInput } from "./protocol.ts";

export type CharState = {
  id: number;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  ragdoll: boolean;
  vehicleId: number;
  seat: number;
  yaw: number;
};

export function stepCharacter(ch: CharState, input: SimInput, dt: number): void {
  if (ch.ragdoll || ch.vehicleId) return;
  ch.yaw = input.yaw;
  const speed = input.sprint ? 7.8 : 4.45;
  const desired = {
    x: input.moveX * speed * dt,
    y: -9.81 * dt * dt * 20,
    z: input.moveZ * speed * dt,
  };
  if (input.jump) desired.y += 5.55 * dt * 8;
  ch.controller.computeColliderMovement(ch.collider, desired);
  const m = ch.controller.computedMovement();
  const t = ch.body.translation();
  ch.body.setNextKinematicTranslation({ x: t.x + m.x, y: t.y + m.y, z: t.z + m.z });
}

/** Keep seated avatar glued to chassis (passenger / driver visual root). */
export function followVehicleSeat(
  ch: CharState,
  chassis: { translation: () => { x: number; y: number; z: number }; rotation: () => { x: number; y: number; z: number; w: number } },
): void {
  if (!ch.vehicleId) return;
  const t = chassis.translation();
  const r = chassis.rotation();
  ch.body.setNextKinematicTranslation({ x: t.x, y: t.y + 0.7, z: t.z });
  ch.body.setNextKinematicRotation(r);
}
