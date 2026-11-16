/**
 * Crossing pedestrians as traffic obstacles.
 */

export type PedYieldLike = {
  intent: string;
  x: number;
  z: number;
};

export type YieldObstacle = { x: number; z: number; r: number };

/** Emit an obstacle for a ped mid-crossing (null otherwise). */
export function pedYieldObstacle(p: PedYieldLike): YieldObstacle | null {
  if (p.intent !== "cross") return null;
  return { x: p.x, z: p.z, r: 0.55 };
}

/** Push nearby crossing peds into an obstacle list (player-centric). */
export function appendCrossingPedObstacles(
  out: YieldObstacle[],
  peds: readonly PedYieldLike[],
  px: number,
  pz: number,
  rangeM = 55,
): void {
  const r2 = rangeM * rangeM;
  for (const p of peds) {
    const o = pedYieldObstacle(p);
    if (!o) continue;
    const dx = o.x - px;
    const dz = o.z - pz;
    if (dx * dx + dz * dz > r2) continue;
    out.push(o);
  }
}
