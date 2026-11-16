/**
 * Pure spawn acceptance — behind/side of camera, mid-far ring, prefer leaving heading.
 * Separated from respawnAgent so tests can lock the rules without a city.
 */

export type SpawnBand = { minD: number; maxD: number };

export function spawnBand(rural: boolean): SpawnBand {
  return rural ? { minD: 100, maxD: 220 } : { minD: 88, maxD: 185 };
}

/**
 * @param dist Distance player → agent
 * @param aheadDot camForward · normalize(agent − player); >0 = in front of camera
 * @param leavingDot agentHeading · (agent − player); >0 = traveling away from player
 */
export function spawnPlacementOk(
  dist: number,
  aheadDot: number,
  leavingDot: number,
  rural: boolean,
): boolean {
  const { minD, maxD } = spawnBand(rural);
  if (dist < minD || dist > maxD) return false;
  // Never pop into the forward cone — behind / wide side only
  if (aheadDot > 0.28) return false;
  if (leavingDot < -0.15 && aheadDot > 0) return false;
  return true;
}

/** Score candidates — higher is better (farther behind, leaving). */
export function spawnPlacementScore(
  dist: number,
  aheadDot: number,
  leavingDot: number,
  rural: boolean,
): number {
  const { minD, maxD } = spawnBand(rural);
  if (dist < minD * 0.85 || dist > maxD * 1.05) return -1e9;
  const mid = (minD + maxD) * 0.5;
  const distScore = 1 - Math.abs(dist - mid) / mid;
  // Hard-reject anything clearly ahead of the camera
  if (aheadDot > 0.35) return -1e9;
  const behind = Math.max(0, -aheadDot);
  const leave = Math.max(0, leavingDot);
  return distScore * 2 + behind * 4 + leave * 1.5;
}
