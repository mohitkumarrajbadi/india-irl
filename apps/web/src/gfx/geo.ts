import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { inkInto, type Ink, vertexMat as surfaceVertexMat } from "./surface";

type Xform = {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
};

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v3 = new THREE.Vector3();
const s3 = new THREE.Vector3();
const paint = new Float32Array(5);

/**
 * Collects primitive shapes, bakes their transforms and a vertex color into
 * them, then merges the lot into one BufferGeometry. One mesh, one draw call.
 * Optional per-vertex `surf` (rough, metal) pairs with `surface.ts` materials.
 */
export class GeoBuilder {
  private readonly parts: THREE.BufferGeometry[] = [];

  add(geo: THREE.BufferGeometry, color: Ink, t: Xform = {}): this {
    // Always non-indexed — RoundedBoxGeometry clears its index; mixing breaks merge.
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (geo.index) geo.dispose();
    g.deleteAttribute("uv");
    if (t.pos || t.rot || t.scale) {
      const p = t.pos ?? [0, 0, 0];
      const r = t.rot ?? [0, 0, 0];
      const s = t.scale ?? [1, 1, 1];
      q.setFromEuler(e.set(r[0], r[1], r[2]));
      m4.compose(v3.set(p[0], p[1], p[2]), q, s3.set(s[0], s[1], s[2]));
      g.applyMatrix4(m4);
    }
    inkInto(color, paint, 0);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    const surf = new Float32Array(n * 2);
    for (let i = 0; i < n; i += 1) {
      arr[i * 3] = paint[0];
      arr[i * 3 + 1] = paint[1];
      arr[i * 3 + 2] = paint[2];
      surf[i * 2] = paint[3];
      surf[i * 2 + 1] = paint[4];
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    g.setAttribute("surf", new THREE.BufferAttribute(surf, 2));
    this.parts.push(g);
    return this;
  }

  /** Merge a pre-coloured geometry (e.g. SDF bake). Ensures `surf` exists. */
  absorb(geo: THREE.BufferGeometry): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (geo.index) geo.dispose();
    g.deleteAttribute("uv");
    if (!g.getAttribute("surf")) {
      const n = g.attributes.position.count;
      g.setAttribute("surf", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    }
    this.parts.push(g);
    return this;
  }

  box(w: number, h: number, d: number, color: Ink, t: Xform = {}): this {
    return this.add(new THREE.BoxGeometry(w, h, d), color, t);
  }

  /** Soft silicone / toy corner — Memoji vehicle & prop language. */
  roundBox(
    w: number,
    h: number,
    d: number,
    color: Ink,
    t: Xform = {},
    radius = 0.06,
    seg = 3,
  ): this {
    const r = Math.min(radius, w * 0.48, h * 0.48, d * 0.48);
    return this.add(new RoundedBoxGeometry(w, h, d, seg, Math.max(0.004, r)), color, t);
  }

  cyl(rTop: number, rBottom: number, h: number, color: Ink, t: Xform = {}, seg = 10): this {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, seg), color, t);
  }

  sphere(r: number, color: Ink, t: Xform = {}, seg = 12): this {
    return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3)), color, t);
  }

  capsule(r: number, len: number, color: Ink, t: Xform = {}, cap = 4, rad = 10): this {
    return this.add(new THREE.CapsuleGeometry(r, len, cap, rad), color, t);
  }

  torus(r: number, tube: number, color: Ink, t: Xform = {}): this {
    return this.add(new THREE.TorusGeometry(r, tube, 8, 18), color, t);
  }

  /** A thin box between two points (cables, braces). */
  strut(a: [number, number, number], b: [number, number, number], thick: number, color: Ink): this {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const euler = new THREE.Euler().setFromQuaternion(quat);
    return this.box(thick, len, thick, color, {
      pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      rot: [euler.x, euler.y, euler.z],
    });
  }

  build(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error("GeoBuilder: nothing to merge");
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
  }
}

/** Shared vertex-color + per-vertex finish material for props / vehicles. */
export const vertexMat = surfaceVertexMat;
export const flatVertexMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.02,
  flatShading: true,
});

/** Flat quads accumulated into typed arrays; used for roads and ground tiles. */
export class QuadBatch {
  private pos: number[] = [];
  private uv: number[] = [];
  private col: number[] = [];
  private idx: number[] = [];
  private n = 0;

  /**
   * Axis-aligned horizontal quad at height y. By default u runs across X and v along Z.
   * With `swap`, u runs across Z and v along X (for roads that run east-west).
   */
  quad(
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    y: number,
    uv: { u0: number; v0: number; u1: number; v1: number; swap?: boolean },
    color: THREE.Color | null = null,
  ): void {
    const { u0, v0, u1, v1, swap } = uv;
    // Counter-clockwise seen from above (+Y normal).
    this.pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0);
    if (swap) this.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    else this.uv.push(u0, v0, u0, v1, u1, v1, u0, v1);
    const r = color?.r ?? 1;
    const g = color?.g ?? 1;
    const b = color?.b ?? 1;
    for (let i = 0; i < 4; i += 1) this.col.push(r, g, b);
    const k = this.n;
    this.idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    this.n += 4;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(this.n * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}
