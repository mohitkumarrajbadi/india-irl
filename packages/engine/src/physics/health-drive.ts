/**
 * Map chassis health 0…1 → Rapier drive force / grip scales.
 * Mirrors arcade `specs-drive` (0.55 + health * 0.45).
 */

export type HealthDriveScale = {
  /** Multiplies throttle / brake impulse. */
  force: number;
  /** Multiplies tyre gripMul. */
  grip: number;
};

export function healthDriveScale(health: number): HealthDriveScale {
  const h = Math.max(0.25, Math.min(1, health));
  const s = 0.55 + h * 0.45;
  return { force: s, grip: s };
}
