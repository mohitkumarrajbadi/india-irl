/**
 * Main-thread pose interpolation helpers (no Rapier).
 * Smooths worker snapshots so render rate ≠ physics step rate without jitter.
 */

export type PoseSample = {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  speed: number;
  yaw: number;
  roll: number;
  at: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function nlerpQuat(
  a: PoseSample,
  b: PoseSample,
  t: number,
): { qx: number; qy: number; qz: number; qw: number } {
  let bx = b.qx;
  let by = b.qy;
  let bz = b.qz;
  let bw = b.qw;
  if (a.qx * bx + a.qy * by + a.qz * bz + a.qw * bw < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  let qx = lerp(a.qx, bx, t);
  let qy = lerp(a.qy, by, t);
  let qz = lerp(a.qz, bz, t);
  let qw = lerp(a.qw, bw, t);
  const inv = 1 / Math.hypot(qx, qy, qz, qw);
  return { qx: qx * inv, qy: qy * inv, qz: qz * inv, qw: qw * inv };
}

/** Interpolate between two chronologically ordered samples. */
export function lerpPose(a: PoseSample, b: PoseSample, t: number): PoseSample {
  const u = Math.min(1, Math.max(0, t));
  const q = nlerpQuat(a, b, u);
  return {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
    z: lerp(a.z, b.z, u),
    ...q,
    speed: lerp(a.speed, b.speed, u),
    yaw: lerpAngle(a.yaw, b.yaw, u),
    roll: lerpAngle(a.roll, b.roll, u),
    at: lerp(a.at, b.at, u),
  };
}
