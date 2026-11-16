/**
 * Pedestrian crosswalk wait — hold at curb while conflicting traffic has green/amber.
 */
import { signalPhase, type LightPhase } from "./signals.ts";

export function nearestJunctionIndex(
  xs: readonly number[],
  zs: readonly number[],
  x: number,
  z: number,
): { ni: number; nj: number; d2: number } {
  let ni = 0;
  let nj = 0;
  let best = Infinity;
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = 0; j < zs.length; j += 1) {
      const dx = x - xs[i]!;
      const dz = z - zs[j]!;
      const d = dx * dx + dz * dz;
      if (d < best) {
        best = d;
        ni = i;
        nj = j;
      }
    }
  }
  return { ni, nj, d2: best };
}

/** Map a travel vector to grid dir 0=+Z, 1=+X, 2=-Z, 3=-X. */
export function dirFromVec(dx: number, dz: number): 0 | 1 | 2 | 3 {
  if (Math.abs(dx) > Math.abs(dz)) return dx >= 0 ? 1 : 3;
  return dz >= 0 ? 0 : 2;
}

/**
 * True while the ped should wait before stepping into the carriageway.
 * Uses the light for traffic traveling along the road (perpendicular to cross).
 */
export function pedCrossShouldWait(
  x: number,
  z: number,
  tx: number,
  tz: number,
  xs: readonly number[],
  zs: readonly number[],
  timeSec: number,
  maxJunctionM = 28,
): boolean {
  if (xs.length === 0 || zs.length === 0) return false;
  const { ni, nj, d2 } = nearestJunctionIndex(xs, zs, x, z);
  if (d2 > maxJunctionM * maxJunctionM) return false;
  const cx = tx - x;
  const cz = tz - z;
  // Carriageway runs perpendicular to the cross vector.
  const roadDir = dirFromVec(-cz, cx);
  const phase: LightPhase = signalPhase(ni, nj, roadDir, timeSec);
  return phase === "green" || phase === "amber";
}
