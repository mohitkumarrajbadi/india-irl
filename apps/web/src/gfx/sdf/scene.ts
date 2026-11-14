/**
 * Clay-sculpting scene: soft primitives that blend into one surface.
 * Pure data (no Three) so the mesher can be tested in Node.
 */
export type V3 = readonly [number, number, number];

export type PrimOpts = {
  pos?: V3;
  /** Euler XYZ, radians. */
  rot?: V3;
  /** Palette slot painted where this primitive wins. */
  slot?: number;
  /** Blend radius with the clay already there (m). 0 = hard edge. */
  k?: number;
  /** Carve out of the clay instead of adding to it. */
  cut?: boolean;
  /** Also add the mirror image across the YZ plane. */
  sym?: boolean;
};

export const KIND = { ellipsoid: 0, box: 1, cone: 2, torus: 3, cyl: 4 } as const;
export const OP = { add: 0, cut: 1, tint: 2 } as const;
/** kind, op, slot, k | 9 rot | 3 pos | 8 params | 4 bounding sphere */
export const STRIDE = 28;

const ZERO: V3 = [0, 0, 0];

export class SdfScene {
  readonly data: number[] = [];
  readonly min = [Infinity, Infinity, Infinity];
  readonly max = [-Infinity, -Infinity, -Infinity];
  count = 0;
  slots = 1;
  private packed: Float64Array | null = null;

  get buf(): Float64Array {
    return (this.packed ??= Float64Array.from(this.data));
  }

  ellipsoid(r: V3, o: PrimOpts = {}): this {
    return this.put(KIND.ellipsoid, [r[0], r[1], r[2]], r, Math.max(r[0], r[1], r[2]), o);
  }

  ball(r: number, o: PrimOpts = {}): this {
    return this.ellipsoid([r, r, r], o);
  }

  /** Box with rounded edges; `half` is the half-size including the rounding. */
  box(half: V3, round: number, o: PrimOpts = {}): this {
    return this.put(KIND.box, [half[0], half[1], half[2], round], half, Math.hypot(half[0], half[1], half[2]), o);
  }

  /** Ring around the local Y axis. */
  torus(ring: number, tube: number, o: PrimOpts = {}): this {
    return this.put(KIND.torus, [ring, tube], [ring + tube, tube, ring + tube], ring + tube, o);
  }

  /** Cylinder along local Y with rounded rims. */
  cyl(rad: number, halfH: number, round: number, o: PrimOpts = {}): this {
    return this.put(KIND.cyl, [rad, halfH, round], [rad, halfH, rad], Math.hypot(rad, halfH), o);
  }

  /** Capsule from a to b whose radius tapers ra → rb. Points are in scene space. */
  cone(a: V3, b: V3, ra: number, rb: number, o: PrimOpts = {}): this {
    if (o.sym) this.cone([-a[0], a[1], a[2]], [-b[0], b[1], b[2]], ra, rb, { ...o, sym: false });
    const reach = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + Math.max(ra, rb);
    const at = this.row(KIND.cone, o.cut ? OP.cut : OP.add, [...a, ...b, ra, rb], ZERO, ZERO, reach, o);
    for (let i = 0; i < 3; i += 1) {
      this.data[at + 24 + i] = (a[i] + b[i]) / 2;
      if (!o.cut) this.grow(i, Math.min(a[i] - ra, b[i] - rb), Math.max(a[i] + ra, b[i] + rb));
    }
    return this;
  }

  /** Paint-only ellipsoid: recolours the surface inside it, fading over `soft` metres. */
  tint(r: V3, slot: number, soft: number, o: PrimOpts = {}, strength = 1): this {
    const reach = Math.max(r[0], r[1], r[2]);
    return this.put(KIND.ellipsoid, [r[0], r[1], r[2], strength], r, reach, { ...o, slot, k: soft }, OP.tint);
  }

  private put(kind: number, params: number[], half: V3, reach: number, o: PrimOpts, op?: number): this {
    const p = o.pos ?? ZERO;
    const r = o.rot ?? ZERO;
    if (o.sym) this.put(kind, params, half, reach, { ...o, sym: false, pos: [-p[0], p[1], p[2]], rot: [r[0], -r[1], -r[2]] }, op);
    const code = op ?? (o.cut ? OP.cut : OP.add);
    const at = this.row(kind, code, params, p, r, reach, o);
    if (code !== OP.add) return this;
    // Row 4.. holds world → local; its transpose rows give the world extents.
    for (let i = 0; i < 3; i += 1) {
      let e = 0;
      for (let j = 0; j < 3; j += 1) e += Math.abs(this.data[at + 4 + j * 3 + i]) * half[j];
      this.grow(i, p[i] - e, p[i] + e);
    }
    return this;
  }

  private row(kind: number, op: number, params: number[], p: V3, r: V3, reach: number, o: PrimOpts): number {
    const at = this.data.length;
    const slot = o.slot ?? (op === OP.cut ? -1 : 0);
    const m = rotation(r);
    const row = new Array<number>(STRIDE).fill(0);
    row[0] = kind;
    row[1] = op;
    row[2] = slot;
    row[3] = o.k ?? 0;
    // World → local is the transpose of the local → world rotation.
    for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) row[4 + i * 3 + j] = m[j * 3 + i];
    for (let i = 0; i < 3; i += 1) row[13 + i] = row[24 + i] = p[i];
    for (let i = 0; i < params.length; i += 1) row[16 + i] = params[i];
    row[27] = reach;
    this.data.push(...row);
    this.count += 1;
    this.packed = null;
    if (slot >= this.slots) this.slots = slot + 1;
    return at;
  }

  private grow(axis: number, lo: number, hi: number): void {
    this.min[axis] = Math.min(this.min[axis], lo);
    this.max[axis] = Math.max(this.max[axis], hi);
  }
}

/** Row-major local → world rotation for Euler XYZ (matches Three). */
function rotation(r: V3): number[] {
  const a = Math.cos(r[0]), b = Math.sin(r[0]);
  const c = Math.cos(r[1]), d = Math.sin(r[1]);
  const e = Math.cos(r[2]), f = Math.sin(r[2]);
  return [c * e, -c * f, d, a * f + b * e * d, a * e - b * f * d, -b * c, b * f - a * e * d, b * e + a * f * d, a * c];
}
