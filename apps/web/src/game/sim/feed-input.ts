/** Map live arcade state + touch bus → worker SimInput (no React). */
import type { SimInput } from "@india-irl/engine";
import { touchInput } from "@/game/input";
import { live } from "@/game/runtime";

const emptyActions: number[] = [];

/**
 * Best-effort intent while PlayerController still owns movement.
 * Throttle/steer derived from foot move axes so the ghost auto can be exercised.
 */
export function buildShadowInput(): SimInput {
  const moveX = touchInput.moving ? touchInput.strafe : 0;
  const moveZ = touchInput.moving ? touchInput.forward : 0;
  return {
    moveX,
    moveZ,
    yaw: live.yaw,
    throttle: moveZ,
    steer: -moveX,
    brake: 0,
    handbrake: false,
    sprint: touchInput.sprint,
    jump: touchInput.jump,
    interact: false,
    gripMul: 1,
    actions: emptyActions,
  };
}
