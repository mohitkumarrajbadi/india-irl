/**
 * Normalizes keyboard / gamepad / touch into one intent object for the sim worker.
 */
import type { SimInput } from "../physics/protocol.ts";

export type Intent = {
  moveVector: { x: number; z: number };
  lookDelta: { x: number; y: number };
  yaw: number;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
  throttle: number;
  steer: number;
  brake: number;
  handbrake: boolean;
  actions: number[];
};

export function createIntent(): Intent {
  return {
    moveVector: { x: 0, z: 0 },
    lookDelta: { x: 0, y: 0 },
    yaw: 0,
    sprint: false,
    jump: false,
    interact: false,
    throttle: 0,
    steer: 0,
    brake: 0,
    handbrake: false,
    actions: [],
  };
}

/** Map intent → worker SET_INPUT payload. */
export function intentToSimInput(intent: Intent): SimInput {
  const len = Math.hypot(intent.moveVector.x, intent.moveVector.z);
  const inv = len > 1 ? 1 / len : 1;
  return {
    moveX: intent.moveVector.x * inv,
    moveZ: intent.moveVector.z * inv,
    yaw: intent.yaw,
    throttle: intent.throttle,
    steer: intent.steer,
    brake: intent.brake,
    handbrake: intent.handbrake,
    sprint: intent.sprint,
    jump: intent.jump,
    interact: intent.interact,
    actions: intent.actions.slice(),
  };
}
