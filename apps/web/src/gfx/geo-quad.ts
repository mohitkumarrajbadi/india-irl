import * as THREE from "three";

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
    // verts: (x0,z0) (x0,z1) (x1,z1) (x1,z0)
    this.pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0);
    if (swap) {
      // u across Z, v along X (east–west roads)
      this.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    } else {
      // u across X, v along Z (north–south roads) — 4th corner must be (u1,v0)
      this.uv.push(u0, v0, u0, v1, u1, v1, u1, v0);
    }
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
    g.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(new Array(this.n * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3),
    );
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}
