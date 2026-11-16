/** Per-tick vehicle integrate + impact detection. */
import { healthDriveScale } from "./health-drive.ts";
import type { SimInput } from "./protocol.ts";
import { followVehicleSeat, type CharState } from "./character.ts";
import type { PostFn, VehState } from "./sim-types.ts";

export const IMPACT_SPEED = 11;

export function stepVehicles(args: {
  vehicles: Map<number, VehState>;
  chars: Map<number, CharState>;
  input: SimInput;
  drivingVehicleId: number;
  localId: number;
  dt: number;
  post: PostFn;
}): void {
  const { vehicles, chars, input, drivingVehicleId, localId, dt, post } = args;
  const driving = vehicles.get(drivingVehicleId);
  if (driving?.controller.authority) {
    const h = healthDriveScale(input.health ?? 1);
    driving.controller.setControls(
      input.throttle * h.force,
      input.steer,
      input.brake * h.force,
      input.handbrake,
      (input.gripMul ?? 1) * h.grip,
    );
  }

  for (const v of vehicles.values()) {
    const before = v.controller.speed();
    v.controller.step(dt);
    const after = v.controller.speed();
    if (before - after > IMPACT_SPEED * 0.35 && before > IMPACT_SPEED) {
      emitImpact(v, before, localId, chars, post);
    }
  }

  const local = chars.get(localId);
  if (local?.vehicleId) {
    const v = vehicles.get(local.vehicleId);
    if (v) followVehicleSeat(local, v.controller);
  }
}

function emitImpact(
  v: VehState,
  speed: number,
  localId: number,
  chars: Map<number, CharState>,
  post: PostFn,
): void {
  void localId;
  void chars;
  const vel = v.controller.body.linvel();
  // Main thread owns eject / rider separation via applyCrashHit — do not freeze
  // the character controller here (that left riders stuck when IMPACT was mild).
  post({
    type: "EVENT",
    event: { type: "IMPACT", entityId: v.id, fx: vel.x, fy: vel.y, fz: vel.z, speed },
  });
}
