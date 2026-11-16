/**
 * Pedestrian respawn placement — avoid camera FOV pops (mirror traffic-spawn).
 */

export function pedSpawnBand(bubble: number, mid: number): { minD: number; maxD: number } {
  const minD = Math.max(28, mid * 0.55);
  const maxD = Math.min(bubble * 0.92, mid + (bubble - mid) * 0.75);
  return { minD, maxD: Math.max(minD + 8, maxD) };
}

/**
 * @param aheadDot camForward · normalize(ped − player); >0 = in front of camera
 */
export function pedSpawnPlacementOk(dist: number, aheadDot: number, bubble: number, mid: number): boolean {
  const { minD, maxD } = pedSpawnBand(bubble, mid);
  if (dist < minD || dist > maxD) return false;
  if (aheadDot > 0.55) return false;
  return true;
}

export function pedSpawnScore(dist: number, aheadDot: number, bubble: number, mid: number): number {
  const { minD, maxD } = pedSpawnBand(bubble, mid);
  if (dist < minD * 0.85 || dist > maxD * 1.05) return -1e9;
  const midD = (minD + maxD) * 0.5;
  const distScore = 1 - Math.abs(dist - midD) / midD;
  return distScore * 2 + Math.max(0, -aheadDot) * 3;
}

/** Sample a ring offset biased behind the camera. */
export function pedSpawnOffset(
  rng: () => number,
  px: number,
  pz: number,
  pyaw: number,
  bubble: number,
  mid: number,
  tries = 10,
): { x: number; z: number } {
  const fwdX = Math.sin(pyaw);
  const fwdZ = Math.cos(pyaw);
  const { minD, maxD } = pedSpawnBand(bubble, mid);
  let bestX = px - fwdX * ((minD + maxD) * 0.5);
  let bestZ = pz - fwdZ * ((minD + maxD) * 0.5);
  let bestScore = -1e9;
  for (let t = 0; t < tries; t += 1) {
    // Bias angle toward behind camera (±120° rear hemisphere).
    const rear = pyaw + Math.PI + (rng() - 0.5) * 2.1;
    const r = minD + rng() * (maxD - minD);
    const x = px + Math.sin(rear) * r;
    const z = pz + Math.cos(rear) * r;
    const dx = x - px;
    const dz = z - pz;
    const d = Math.hypot(dx, dz);
    if (d < 1e-3) continue;
    const ahead = (dx / d) * fwdX + (dz / d) * fwdZ;
    if (pedSpawnPlacementOk(d, ahead, bubble, mid)) return { x, z };
    const score = pedSpawnScore(d, ahead, bubble, mid);
    if (score > bestScore) {
      bestScore = score;
      bestX = x;
      bestZ = z;
    }
  }
  return { x: bestX, z: bestZ };
}
