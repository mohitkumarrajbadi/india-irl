/** Cam-relative foot axes → worker SimInput. */
import type { SimInput } from "@india-irl/engine";

export type FootAxes = {
  forward: number;
  strafe: number;
  camYaw: number;
  facing: number;
  sprint: boolean;
  jump: boolean;
  stunned: boolean;
};

const actions: number[] = [];

export function simInputFromFootAxes(a: FootAxes): SimInput {
  let moveX = 0;
  let moveZ = 0;
  let yaw = a.facing;
  if (!a.stunned) {
    const mag = Math.hypot(a.forward, a.strafe);
    if (mag > 0.04) {
      const inv = 1 / mag;
      const pace = Math.min(1, mag);
      const sin = Math.sin(a.camYaw);
      const cos = Math.cos(a.camYaw);
      moveX = (a.forward * inv * sin - a.strafe * inv * cos) * pace;
      moveZ = (a.forward * inv * cos + a.strafe * inv * sin) * pace;
      yaw = Math.atan2(moveX, moveZ);
    }
  }
  return {
    moveX,
    moveZ,
    yaw,
    throttle: 0,
    steer: 0,
    brake: 0,
    handbrake: false,
    sprint: a.sprint && !a.stunned,
    jump: a.jump && !a.stunned,
    interact: false,
    actions,
  };
}
