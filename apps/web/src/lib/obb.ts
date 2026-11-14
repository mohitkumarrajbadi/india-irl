/**
 * Oriented box overlap on XZ (yaw around Y).
 * Tighter than circle proxies for vehicle–vehicle / vehicle–ped hits.
 */
export type Obb = {
  x: number;
  z: number;
  /** Radians; +Z is forward. */
  yaw: number;
  halfL: number;
  halfW: number;
};

/** True if two OBBs overlap (SAT on axes of both boxes). */
export function obbOverlap(a: Obb, b: Obb): boolean {
  const cosA = Math.cos(a.yaw);
  const sinA = Math.sin(a.yaw);
  const cosB = Math.cos(b.yaw);
  const sinB = Math.sin(b.yaw);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  // Axes: A-forward, A-right, B-forward, B-right
  return (
    sep(dx, dz, sinA, cosA, a.halfL, b, cosB, sinB) &&
    sep(dx, dz, cosA, -sinA, a.halfW, b, cosB, sinB) &&
    sep(dx, dz, sinB, cosB, b.halfL, a, cosA, sinA) &&
    sep(dx, dz, cosB, -sinB, b.halfW, a, cosA, sinA)
  );
}

function sep(
  dx: number,
  dz: number,
  ax: number,
  az: number,
  aExtent: number,
  other: Obb,
  oCos: number,
  oSin: number,
): boolean {
  const dist = dx * ax + dz * az;
  const oFwd = Math.abs(oSin * ax + oCos * az) * other.halfL;
  const oRight = Math.abs(oCos * ax - oSin * az) * other.halfW;
  return Math.abs(dist) <= aExtent + oFwd + oRight + 1e-6;
}

/** Point vs OBB (for ped crush). */
export function pointInObb(px: number, pz: number, b: Obb): boolean {
  const dx = px - b.x;
  const dz = pz - b.z;
  const cos = Math.cos(b.yaw);
  const sin = Math.sin(b.yaw);
  const localZ = dx * sin + dz * cos;
  const localX = dx * cos - dz * sin;
  return Math.abs(localZ) <= b.halfL && Math.abs(localX) <= b.halfW;
}

/** Minimum translation to separate A from B along the shallowest axis (approx). */
export function obbPushOut(a: Obb, b: Obb): { nx: number; nz: number; depth: number } {
  const cos = Math.cos(a.yaw);
  const sin = Math.sin(a.yaw);
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  const along = dx * sin + dz * cos;
  const lat = dx * cos - dz * sin;
  const penZ = a.halfL + b.halfL - Math.abs(along);
  const penX = a.halfW + b.halfW - Math.abs(lat);
  if (penZ < penX) {
    const s = along >= 0 ? 1 : -1;
    return { nx: sin * s, nz: cos * s, depth: Math.max(0, penZ) };
  }
  const s = lat >= 0 ? 1 : -1;
  return { nx: cos * s, nz: -sin * s, depth: Math.max(0, penX) };
}
