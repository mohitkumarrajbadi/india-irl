/** Soft traffic yaw integration — damp large corrections. */
import { clamp, wrapAngle } from "../lib/math.ts";

/**
 * @returns yaw delta for this frame (already * dt)
 */
export function trafficYawStep(
  errRaw: number,
  speed: number,
  turnRadiusFactor: number,
  dt: number,
): number {
  const err = wrapAngle(errRaw);
  const abs = Math.abs(err);
  const yawGain = abs > 0.9 ? 1.85 : abs > 0.5 ? 2.45 : 3.1;
  const maxYaw = Math.max(0.32, speed / Math.max(1, turnRadiusFactor));
  return clamp(err * yawGain, -maxYaw, maxYaw) * dt;
}
