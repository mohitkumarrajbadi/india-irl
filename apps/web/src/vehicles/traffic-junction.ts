/**
 * Junction aim — quadratic corner blend so traffic doesn't chord-cut.
 */

export type JunctionAimIn = {
  x: number;
  z: number;
  tx: number;
  tz: number;
  t2x: number;
  t2z: number;
  /** Distance to stage-0 waypoint. */
  toDist: number;
  /** Start blending this far from entry waypoint (m). */
  blendStart?: number;
};

export type AimPoint = { x: number; z: number };

/**
 * Stage-0 approach: Bezier through entry → corner control → exit.
 * Far from junction: seek entry. Near: pull aim onto the curve.
 */
export function junctionAimPoint(p: JunctionAimIn): AimPoint {
  const start = p.blendStart ?? 11;
  if (p.toDist >= start) return { x: p.tx, z: p.tz };

  const u = 1 - Math.max(0, Math.min(1, p.toDist / start));
  // Control point pulled toward the turn (weighted average biased to exit).
  const cx = p.tx * 0.35 + p.t2x * 0.65;
  const cz = p.tz * 0.35 + p.t2z * 0.65;
  const omu = 1 - u;
  // Quadratic Bezier: P0=tx, P1=control, P2=t2
  const x = omu * omu * p.tx + 2 * omu * u * cx + u * u * p.t2x;
  const z = omu * omu * p.tz + 2 * omu * u * cz + u * u * p.t2z;
  return { x, z };
}
