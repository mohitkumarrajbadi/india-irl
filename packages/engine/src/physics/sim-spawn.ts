/**
 * Factory helpers: local character + vehicles into a Rapier world.
 * CCD is enabled on all high-speed dynamics (vehicles) here.
 */
import type RAPIER from "@dimforge/rapier3d-compat";
import { quatFromYaw } from "./math3.ts";
import type { CharState } from "./character.ts";
import {
  CHAR_FRICTION,
  CHAR_RESTITUTION,
  VEHICLE_FRICTION,
  VEHICLE_RESTITUTION,
} from "./materials.ts";
import { RaycastVehicleController } from "./vehicle-controller.ts";
import { chassisHalfExtents, tuningFor } from "./vehicle-tuning.ts";
import type { VehState } from "./sim-types.ts";
import type { VehicleKind } from "../../../shared/src/index.ts";

export function spawnLocalCharacter(
  rapier: typeof RAPIER,
  world: RAPIER.World,
  chars: Map<number, CharState>,
  id: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
): void {
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z),
  );
  const collider = world.createCollider(
    rapier.ColliderDesc.capsule(0.45, 0.28)
      .setFriction(CHAR_FRICTION)
      .setRestitution(CHAR_RESTITUTION),
    body,
  );
  const controller = world.createCharacterController(0.01);
  controller.setApplyImpulsesToDynamicBodies(true);
  chars.set(id, { id, body, collider, controller, ragdoll: false, vehicleId: 0, seat: 0, yaw });
}

export function spawnVehicleEntity(
  rapier: typeof RAPIER,
  world: RAPIER.World,
  vehicles: Map<number, VehState>,
  id: number,
  kind: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
): void {
  const tuning = tuningFor(kind as VehicleKind);
  const { hx, hy, hz } = chassisHalfExtents(kind);
  // CCD: continuous collision — prevents tunneling at high speed / frame skips.
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.dynamic()
      .setTranslation(x, y + hy, z)
      .setRotation(quatFromYaw(yaw))
      .setCanSleep(false)
      .setCcdEnabled(true)
      .setLinearDamping(0.3)
      .setAngularDamping(1.2)
      .setAdditionalMass(tuning.mass),
  );
  const collider = world.createCollider(
    rapier.ColliderDesc.cuboid(hx, hy, hz)
      .setFriction(VEHICLE_FRICTION)
      .setRestitution(VEHICLE_RESTITUTION),
    body,
  );
  const controller = new RaycastVehicleController(rapier, world, body, tuning);
  vehicles.set(id, { id, kind, controller, collider });
}
