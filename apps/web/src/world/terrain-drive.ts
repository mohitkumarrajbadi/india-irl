/** Terrain helpers for arcade drive / foot. */
import { forwardGrade, type TerrainSample } from "./terrain-sample.ts";

/** Lateral slope (+ = rises to vehicle right) for bank/roll feel. */
export function lateralGrade(sample: TerrainSample, yaw: number): number {
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return sample.gradX * cos - sample.gradZ * sin;
}

/** Forward slope for DriveInput.grade (+ = uphill). Clamped so ramps don't snap. */
export function driveGrade(sample: TerrainSample, yaw: number): number {
  return Math.max(-0.45, Math.min(0.45, forwardGrade(sample, yaw)));
}
