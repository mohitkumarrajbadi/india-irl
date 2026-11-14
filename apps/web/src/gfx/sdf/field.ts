/** Distance + paint evaluation for an SdfScene. Hot loop: no allocation. */
import { KIND, OP, STRIDE, type SdfScene } from "./scene.ts";

function primDist(b: Float64Array, o: number, x: number, y: number, z: number): number {
  const p = o + 16;
  switch (b[o]) {
    case KIND.ellipsoid: {
      const kx = x / b[p], ky = y / b[p + 1], kz = z / b[p + 2];
      const k0 = Math.sqrt(kx * kx + ky * ky + kz * kz);
      if (k0 < 1e-6) return -Math.min(b[p], b[p + 1], b[p + 2]);
      const gx = kx / b[p], gy = ky / b[p + 1], gz = kz / b[p + 2];
      return (k0 * (k0 - 1)) / Math.sqrt(gx * gx + gy * gy + gz * gz);
    }
    case KIND.box: {
      const r = b[p + 3];
      const qx = Math.abs(x) - b[p] + r, qy = Math.abs(y) - b[p + 1] + r, qz = Math.abs(z) - b[p + 2] + r;
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
      return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
    }
    case KIND.torus: {
      const q = Math.sqrt(x * x + z * z) - b[p];
      return Math.sqrt(q * q + y * y) - b[p + 1];
    }
    case KIND.cyl: {
      const r = b[p + 2];
      const dx = Math.sqrt(x * x + z * z) - b[p] + r;
      const dy = Math.abs(y) - b[p + 1] + r;
      const ox = Math.max(dx, 0), oy = Math.max(dy, 0);
      return Math.min(Math.max(dx, dy), 0) + Math.sqrt(ox * ox + oy * oy) - r;
    }
    default:
      return roundCone(b, p, x, y, z);
  }
}

/** Inigo Quilez's exact round cone between two points. */
function roundCone(b: Float64Array, p: number, x: number, y: number, z: number): number {
  const r1 = b[p + 6], r2 = b[p + 7];
  const bx = b[p + 3] - b[p], by = b[p + 4] - b[p + 1], bz = b[p + 5] - b[p + 2];
  const l2 = bx * bx + by * by + bz * bz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const px = x - b[p], py = y - b[p + 1], pz = z - b[p + 2];
  const yy = px * bx + py * by + pz * bz;
  const zz = yy - l2;
  const cx = px * l2 - bx * yy, cy = py * l2 - by * yy, cz = pz * l2 - bz * yy;
  const x2 = cx * cx + cy * cy + cz * cz;
  const y2 = yy * yy * l2;
  const z2 = zz * zz * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Signed distance at a point. When `w` is given it is filled with the paint
 * weight of every palette slot (they sum to 1 on the surface).
 */
export function sample(s: SdfScene, x: number, y: number, z: number, w: Float32Array | null = null): number {
  const b = s.buf;
  let d = 1e9;
  if (w) w.fill(0);
  for (let i = 0, o = 0; i < s.count; i += 1, o += STRIDE) {
    const op = b[o + 1];
    const k = b[o + 3];
    if (op === OP.tint && !w) continue;
    // Bounding-sphere reject: a far primitive cannot change the blend.
    const ex = x - b[o + 24], ey = y - b[o + 25], ez = z - b[o + 26];
    const far = Math.sqrt(ex * ex + ey * ey + ez * ez) - b[o + 27];
    if (op === OP.add ? far >= d + k : op === OP.cut ? far >= k - d : far >= k) continue;

    const dx = x - b[o + 13], dy = y - b[o + 14], dz = z - b[o + 15];
    const di = primDist(
      b,
      o,
      b[o + 4] * dx + b[o + 5] * dy + b[o + 6] * dz,
      b[o + 7] * dx + b[o + 8] * dy + b[o + 9] * dz,
      b[o + 10] * dx + b[o + 11] * dy + b[o + 12] * dz,
    );
    let h: number;
    if (op === OP.add) {
      h = k > 0 ? clamp01(0.5 + (0.5 * (d - di)) / k) : di < d ? 1 : 0;
      d = d * (1 - h) + di * h - k * h * (1 - h);
    } else if (op === OP.cut) {
      h = k > 0 ? clamp01(0.5 - (0.5 * (di + d)) / k) : -di > d ? 1 : 0;
      d = d * (1 - h) - di * h + k * h * (1 - h);
    } else {
      h = clamp01(0.5 - (0.5 * di) / Math.max(k, 1e-6)) * b[o + 19];
    }
    const slot = b[o + 2];
    if (w && slot >= 0 && h > 0) {
      for (let j = 0; j < w.length; j += 1) w[j] *= 1 - h;
      w[slot] += h;
    }
  }
  return d;
}
