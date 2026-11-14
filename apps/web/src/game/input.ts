/**
 * Shared input bus. Keyboard writes into PlayerController local state;
 * touch overlays write here and are merged each frame.
 */
export const touchInput = {
  /** True when a finger is on the move stick. */
  moving: false,
  forward: 0,
  strafe: 0,
  /** Accumulated look deltas in pixels since last frame. */
  lookDX: 0,
  lookDY: 0,
  sprint: false,
  jump: false,
  /** One-shot action codes drained by the controller: Digit1, KeyE, KeyH, KeyZ… */
  pulses: [] as string[],
};

export function pulseAction(code: string): void {
  touchInput.pulses.push(code);
}

export function isTouchUiPreferred(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const noHover = window.matchMedia?.("(hover: none)")?.matches;
  return !!(coarse || noHover || navigator.maxTouchPoints > 0);
}
