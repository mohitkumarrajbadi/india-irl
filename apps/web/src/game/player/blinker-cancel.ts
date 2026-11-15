/** Auto-cancel player indicators after a matching turn completes. */
import type { PlayerState } from "./types.ts";

/** Call each drive frame. +steer = left (local +X), −steer = right. */
export function tickBlinkerCancel(s: PlayerState): void {
  if (s.blinker === 0) {
    s.blinkerArmed = false;
    return;
  }
  const matching =
    s.blinker === -1 ? s.ds.steer > 0.4 : s.ds.steer < -0.4;
  if (matching) s.blinkerArmed = true;
  if (s.blinkerArmed && Math.abs(s.ds.steer) < 0.14) {
    s.blinker = 0;
    s.blinkerArmed = false;
  }
}
