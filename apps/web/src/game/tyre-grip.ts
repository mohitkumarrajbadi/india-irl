/**
 * Compose terrain surface grip × weather wet multiplier.
 * Keeps arcade + Rapier paths on one formula.
 */

/** @returns clamp'd grip mul for drive (0.35…1.2) */
export function tyreGripMul(terrainGrip: number, wetMul: number): number {
  const g = Math.max(0, terrainGrip) * Math.max(0, wetMul);
  return Math.min(1.2, Math.max(0.35, g));
}
