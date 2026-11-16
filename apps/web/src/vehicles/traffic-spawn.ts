/**
 * Pure spawn acceptance — mid-range ring with soft behind bias.
 * Nearby ahead traffic is allowed so streets don't look empty.
 */

export type SpawnBand = { minD: number; maxD: number };

export function spawnBand(rural: boolean): SpawnBand {
  return rural ? { minD: 40, maxD: 170 } : { minD: 24, maxD: 125 };
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
  // Only reject close FOV pops — mid/far ahead traffic is intentional density
  if (aheadDot > 0.55 && dist < (rural ? 55 : 42)) return false;
  if (leavingDot < -0.35 && aheadDot > 0.7 && dist < 50) return false;
  return true;
}

/** Score candidates — higher is better (visible ring, slight behind bias). */
export function spawnPlacementScore(
  dist: number,
  aheadDot: number,
  leavingDot: number,
  rural: boolean,
): number {
  const { minD, maxD } = spawnBand(rural);
  if (dist < minD * 0.75 || dist > maxD * 1.08) return -1e9;
  const mid = (minD + maxD) * 0.45;
  const distScore = 1 - Math.abs(dist - mid) / mid;
  // Hard-reject only very close forward pops
  if (aheadDot > 0.75 && dist < 35) return -1e9;
  const behind = Math.max(0, -aheadDot);
  const side = 1 - Math.abs(aheadDot);
  const leave = Math.max(0, leavingDot);
  // Prefer a mix: sides + some ahead for living streets
  return distScore * 2.2 + behind * 1.4 + side * 1.8 + leave * 0.8 + Math.max(0, aheadDot) * 0.9;
}
