import { clamp } from "@/lib/math";
import { touchInput } from "@/game/input";
import { LOOK_SENS } from "./constants.ts";
import type { PlayerState } from "./types.ts";

export type MoveAxes = {
  forward: number;
  strafe: number;
  sprint: boolean;
  jump: boolean;
};

export function stepLook(s: PlayerState, dt: number): MoveAxes {
  s.mouseX += touchInput.lookDX;
  s.mouseY += touchInput.lookDY;
  touchInput.lookDX = 0;
  touchInput.lookDY = 0;
  s.camYaw -= s.mouseX * LOOK_SENS;
  s.camPitch = clamp(s.camPitch + s.mouseY * LOOK_SENS, -0.2, 1.1);
  if (s.mouseX !== 0 || s.mouseY !== 0) s.idle = 0;
  else s.idle += dt;
  s.mouseX = 0;
  s.mouseY = 0;

  const k = s.keys;
  const touchF = touchInput.moving ? touchInput.forward : 0;
  const touchS = touchInput.moving ? touchInput.strafe : 0;
  return {
    forward: (k.w ? 1 : 0) - (k.s ? 1 : 0) + touchF,
    strafe: (k.d ? 1 : 0) - (k.a ? 1 : 0) + touchS,
    sprint: k.shift || touchInput.sprint,
    jump: k.space || touchInput.jump,
  };
}
