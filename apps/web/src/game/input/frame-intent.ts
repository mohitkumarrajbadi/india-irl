/** Build worker SimInput from one animation-frame’s axes (no React). */
import type { SimInput } from "@india-irl/engine";

export type FrameAxes = {
  forward: number;
  strafe: number;
  yaw: number;
  sprint: boolean;
  jump: boolean;
  /** Current signed chassis speed — used for brake-vs-reverse. */
  speed?: number;
  /** Terrain × weather grip (1 = dry asphalt). */
  gripMul?: number;
  /** Chassis health 0…1 — scales Rapier drive force. */
  health?: number;
};

const actions: number[] = [];

/** Drive: forward→throttle, strafe→steer; Space=handbrake; opposite stick=brake. */
export function simInputFromDriveAxes(a: FrameAxes): SimInput {
  const throttle = clamp(a.forward, -1, 1);
  const steer = clamp(a.strafe, -1, 1);
  const spd = a.speed ?? 0;
  const braking =
    (throttle < -0.05 && spd > 1.2) || (throttle > 0.05 && spd < -1.2) ? Math.abs(throttle) : 0;
  const driveThrottle = braking > 0 ? 0 : a.sprint && throttle > 0 ? 1 : throttle;
  return {
    moveX: steer,
    moveZ: throttle,
    yaw: a.yaw,
    throttle: driveThrottle,
    steer,
    brake: braking,
    handbrake: a.jump,
    sprint: a.sprint,
    jump: false,
    interact: false,
    gripMul: a.gripMul ?? 1,
    health: a.health ?? 1,
    actions,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
