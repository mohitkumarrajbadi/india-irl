/**
 * Following-distance want speed — closing-speed aware (TTC-ish).
 */

/**
 * Desired speed given gap to lead vehicle.
 * @param gap Bumper gap (m)
 * @param selfSpeed m/s
 * @param otherSpeed m/s (0 if stopped/wrecked)
 * @param followPad Comfort gap (m)
 */
export function followWant(
  gap: number,
  selfSpeed: number,
  otherSpeed: number,
  followPad: number,
): number {
  const closing = Math.max(0, selfSpeed - otherSpeed);
  const ttcPad = closing * 0.55; // extra meters when closing fast
  const need = followPad + ttcPad;
  const base = Math.max(0, (gap - need) * 1.35 + otherSpeed * 0.35);
  if (closing > 2.5 && gap < need + 4) {
    return Math.min(base, otherSpeed * 0.85 + Math.max(0, gap - followPad) * 0.4);
  }
  return base;
}
