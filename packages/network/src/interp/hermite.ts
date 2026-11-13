/** Cubic Hermite interpolation for remote poses @ 15Hz → display refresh. */

export type PoseSample = {
  t: number;
  x: number;
  y: number;
  z: number;
  /** Velocity estimate (m/s) for Hermite tangents. */
  vx: number;
  vy: number;
  vz: number;
};

export function hermitePose(a: PoseSample, b: PoseSample, now: number): { x: number; y: number; z: number } {
  const dt = Math.max(1e-4, b.t - a.t);
  let u = (now - a.t) / dt;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return {
    x: h00 * a.x + h10 * a.vx * dt + h01 * b.x + h11 * b.vx * dt,
    y: h00 * a.y + h10 * a.vy * dt + h01 * b.y + h11 * b.vy * dt,
    z: h00 * a.z + h10 * a.vz * dt + h01 * b.z + h11 * b.vz * dt,
  };
}
