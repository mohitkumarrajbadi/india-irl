/** Terrain helpers for arcade drive / foot. */
import { forwardGrade, type TerrainSample } from "./terrain-sample.ts";

/** Forward slope for DriveInput.grade (+ = uphill). */
export function driveGrade(sample: TerrainSample, yaw: number): number {
  return forwardGrade(sample, yaw);
}
