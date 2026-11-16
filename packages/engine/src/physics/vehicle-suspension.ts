/** Per-wheel suspension + lateral friction for one raycast vehicle step. */
import type RAPIER from "@dimforge/rapier3d-compat";
import { add, clamp, rotateVec, type Vec3 } from "./math3.ts";
import type { VehicleTuning, WheelTuning } from "./vehicle-tuning.ts";

export type WheelState = {
  compression: number;
  grounded: boolean;
  contactY: number;
};

export function applyWheelForces(args: {
  rapier: typeof RAPIER;
  world: RAPIER.World;
  body: RAPIER.RigidBody;
  tuning: VehicleTuning;
  wheels: WheelState[];
  pos: Vec3;
  rot: { x: number; y: number; z: number; w: number };
  linvel: Vec3;
  right: Vec3;
  dt: number;
  gripMul?: number;
}): boolean {
  const { rapier, world, body, tuning, wheels, pos, rot, linvel, right, dt } = args;
  const gripMul = args.gripMul ?? 1;
  let groundedAny = false;

  for (let i = 0; i < tuning.wheels.length; i += 1) {
    const w = tuning.wheels[i];
    const ws = wheels[i];
    if (
      applyOneWheel({
        rapier,
        world,
        body,
        w,
        ws,
        pos,
        rot,
        linvel,
        right,
        mass: tuning.mass,
        dt,
        gripMul,
      })
    ) {
      groundedAny = true;
    }
  }
  return groundedAny;
}

function applyOneWheel(a: {
  rapier: typeof RAPIER;
  world: RAPIER.World;
  body: RAPIER.RigidBody;
  w: WheelTuning;
  ws: WheelState;
  pos: Vec3;
  rot: { x: number; y: number; z: number; w: number };
  linvel: Vec3;
  right: Vec3;
  mass: number;
  dt: number;
  gripMul: number;
}): boolean {
  const origin = add(a.pos, rotateVec(a.w.local, a.rot));
  const maxLen = a.w.restLength + a.w.maxTravel + a.w.radius;
  const down = new a.rapier.Ray(origin, { x: 0, y: -1, z: 0 });
  const hit = a.world.castRay(down, maxLen, true, undefined, undefined, undefined, a.body);
  if (!hit) {
    a.ws.grounded = false;
    a.ws.compression = 0;
    return false;
  }

  const dist = hit.timeOfImpact;
  const travel = Math.max(0, dist - a.w.radius);
  const compression = clamp(a.w.restLength - travel, 0, a.w.maxTravel + a.w.restLength);
  a.ws.grounded = true;
  a.ws.compression = compression;
  a.ws.contactY = origin.y - dist;

  const forceY = compression * a.w.stiffness + -a.linvel.y * a.w.damping;
  a.body.applyImpulseAtPoint({ x: 0, y: forceY * a.dt, z: 0 }, origin, true);

  const sideSpeed = a.linvel.x * a.right.x + a.linvel.z * a.right.z;
  const k = a.w.friction * a.gripMul * a.mass * a.dt * 0.15;
  a.body.applyImpulseAtPoint(
    { x: -a.right.x * sideSpeed * k, y: 0, z: -a.right.z * sideSpeed * k },
    origin,
    true,
  );
  return true;
}
