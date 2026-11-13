/** Pure 3D helpers for the sim worker (no Rapier). */

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function rotateVec(v: Vec3, q: Quat): Vec3 {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

export function yawVec(v: Vec3, yaw: number): Vec3 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}

export function quatFromYaw(yaw: number): Quat {
  const h = yaw * 0.5;
  return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
}
