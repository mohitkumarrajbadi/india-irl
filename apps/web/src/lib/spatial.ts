import type { Aabb, Circle } from "../world/types.ts";
import { resolveCircle, type Vec2 } from "./collision.ts";

/**
 * Uniform grid over static colliders, stored CSR style in typed arrays.
 * Build is O(n). A query touches only the handful of cells under the circle,
 * so a city of thousands of colliders costs the same per frame as a few.
 */
export class StaticGrid {
  private readonly cell: number;
  private readonly minX: number;
  private readonly minZ: number;
  private readonly nx: number;
  private readonly nz: number;
  private readonly boxStart: Uint32Array;
  private readonly boxIds: Uint32Array;
  private readonly circleStart: Uint32Array;
  private readonly circleIds: Uint32Array;
  private readonly nearBoxes: Aabb[] = [];
  private readonly nearCircles: Circle[] = [];

  private readonly boxes: readonly Aabb[];
  private readonly circles: readonly Circle[];

  constructor(
    boxes: readonly Aabb[],
    circles: readonly Circle[],
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    cell = 24,
  ) {
    this.boxes = boxes;
    this.circles = circles;
    this.cell = cell;
    this.minX = bounds.minX - cell;
    this.minZ = bounds.minZ - cell;
    this.nx = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cell) + 3);
    this.nz = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / cell) + 3);

    const cells = this.nx * this.nz;
    const boxCsr = this.csr(cells, (visit) => this.forEachBoxCell(visit));
    const circleCsr = this.csr(cells, (visit) => this.forEachCircleCell(visit));
    this.boxStart = boxCsr.start;
    this.boxIds = boxCsr.ids;
    this.circleStart = circleCsr.start;
    this.circleIds = circleCsr.ids;
  }

  /** Two-pass counting sort into CSR arrays. No per-cell arrays, no Map. */
  private csr(
    cells: number,
    each: (visit: (id: number, cx: number, cz: number) => void) => void,
  ): { start: Uint32Array; ids: Uint32Array } {
    const start = new Uint32Array(cells + 1);
    each((_, cx, cz) => {
      start[cz * this.nx + cx + 1] += 1;
    });
    for (let i = 0; i < cells; i += 1) start[i + 1] += start[i];
    const ids = new Uint32Array(start[cells]);
    const cursor = start.slice(0, cells);
    each((id, cx, cz) => {
      ids[cursor[cz * this.nx + cx]++] = id;
    });
    return { start, ids };
  }

  private cx(x: number): number {
    return Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.minX) / this.cell)));
  }

  private cz(z: number): number {
    return Math.min(this.nz - 1, Math.max(0, Math.floor((z - this.minZ) / this.cell)));
  }

  private forEachBoxCell(visit: (id: number, cx: number, cz: number) => void): void {
    for (let i = 0; i < this.boxes.length; i += 1) {
      const b = this.boxes[i];
      const x1 = this.cx(b.maxX);
      const z1 = this.cz(b.maxZ);
      for (let cz = this.cz(b.minZ); cz <= z1; cz += 1) {
        for (let cx = this.cx(b.minX); cx <= x1; cx += 1) visit(i, cx, cz);
      }
    }
  }

  private forEachCircleCell(visit: (id: number, cx: number, cz: number) => void): void {
    for (let i = 0; i < this.circles.length; i += 1) {
      const c = this.circles[i];
      const x1 = this.cx(c.x + c.r);
      const z1 = this.cz(c.z + c.r);
      for (let cz = this.cz(c.z - c.r); cz <= z1; cz += 1) {
        for (let cx = this.cx(c.x - c.r); cx <= x1; cx += 1) visit(i, cx, cz);
      }
    }
  }

  /** Fills the reusable `nearBoxes` / `nearCircles` lists (duplicates are harmless). */
  private gather(x: number, z: number, r: number): void {
    this.nearBoxes.length = 0;
    this.nearCircles.length = 0;
    const x1 = this.cx(x + r);
    const z1 = this.cz(z + r);
    for (let cz = this.cz(z - r); cz <= z1; cz += 1) {
      for (let cx = this.cx(x - r); cx <= x1; cx += 1) {
        const c = cz * this.nx + cx;
        for (let k = this.boxStart[c]; k < this.boxStart[c + 1]; k += 1) {
          this.nearBoxes.push(this.boxes[this.boxIds[k]]);
        }
        for (let k = this.circleStart[c]; k < this.circleStart[c + 1]; k += 1) {
          this.nearCircles.push(this.circles[this.circleIds[k]]);
        }
      }
    }
  }

  resolve(x: number, z: number, radius: number, out: Vec2): Vec2 {
    this.gather(x, z, radius + 1);
    return resolveCircle(x, z, radius, this.nearBoxes, this.nearCircles, out);
  }

  /** True when a point at height `y` sits inside a building. Used by the camera boom. */
  blocked(x: number, y: number, z: number, pad = 0): boolean {
    const c = this.cz(z) * this.nx + this.cx(x);
    for (let k = this.boxStart[c]; k < this.boxStart[c + 1]; k += 1) {
      const b = this.boxes[this.boxIds[k]];
      if (
        x > b.minX - pad && x < b.maxX + pad &&
        z > b.minZ - pad && z < b.maxZ + pad &&
        y < (b.h ?? 8) + pad
      ) {
        return true;
      }
    }
    return false;
  }
}
