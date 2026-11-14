/**
 * Surface Nets: turns an SdfScene into a smooth, watertight triangle mesh.
 * One vertex per surface cell, snapped onto the true surface, with analytic
 * normals and per-slot paint weights.
 */
import { sample } from "./field.ts";
import { SdfScene } from "./scene.ts";

export type SdfMesh = {
  pos: Float32Array;
  nrm: Float32Array;
  idx: Uint32Array;
  /** `slots` paint weights per vertex. */
  w: Float32Array;
  slots: number;
};

/** Corner offsets of a cell and the 12 edges between them. */
const CORNER = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1];
const EDGE = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];

export function meshScene(s: SdfScene, cell: number): SdfMesh {
  const pad = cell * 2;
  const org = [s.min[0] - pad, s.min[1] - pad, s.min[2] - pad];
  const n = [0, 1, 2].map((i) => Math.max(2, Math.ceil((s.max[i] - s.min[i] + pad * 2) / cell)));
  const px = n[0] + 1, py = n[1] + 1;
  const val = new Float32Array(px * py * (n[2] + 1));
  for (let k = 0, q = 0; k <= n[2]; k += 1) {
    for (let j = 0; j <= n[1]; j += 1) {
      for (let i = 0; i <= n[0]; i += 1, q += 1) val[q] = sample(s, org[0] + i * cell, org[1] + j * cell, org[2] + k * cell);
    }
  }

  // One vertex per cell the surface passes through.
  const cellVert = new Int32Array(n[0] * n[1] * n[2]).fill(-1);
  const pos: number[] = [];
  const c = new Float64Array(8);
  for (let k = 0; k < n[2]; k += 1) {
    for (let j = 0; j < n[1]; j += 1) {
      for (let i = 0; i < n[0]; i += 1) {
        let inside = 0;
        for (let v = 0; v < 8; v += 1) {
          c[v] = val[i + CORNER[v * 3] + (j + CORNER[v * 3 + 1]) * px + (k + CORNER[v * 3 + 2]) * px * py];
          if (c[v] < 0) inside += 1;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0, sy = 0, sz = 0, hits = 0;
        for (let e = 0; e < 24; e += 2) {
          const a = EDGE[e], b = EDGE[e + 1];
          if (c[a] < 0 === c[b] < 0) continue;
          const t = c[a] / (c[a] - c[b]);
          sx += CORNER[a * 3] + (CORNER[b * 3] - CORNER[a * 3]) * t;
          sy += CORNER[a * 3 + 1] + (CORNER[b * 3 + 1] - CORNER[a * 3 + 1]) * t;
          sz += CORNER[a * 3 + 2] + (CORNER[b * 3 + 2] - CORNER[a * 3 + 2]) * t;
          hits += 1;
        }
        cellVert[i + j * n[0] + k * n[0] * n[1]] = pos.length / 3;
        pos.push(org[0] + (i + sx / hits) * cell, org[1] + (j + sy / hits) * cell, org[2] + (k + sz / hits) * cell);
      }
    }
  }

  // One quad per grid edge that crosses the surface, joining the 4 cells around it.
  const idx: number[] = [];
  const step = [1, px, px * py];
  const cstep = [1, n[0], n[0] * n[1]];
  const g = [0, 0, 0];
  for (g[2] = 0; g[2] <= n[2]; g[2] += 1) {
    for (g[1] = 0; g[1] <= n[1]; g[1] += 1) {
      for (g[0] = 0; g[0] <= n[0]; g[0] += 1) {
        const q = g[0] + g[1] * px + g[2] * px * py;
        for (let a = 0; a < 3; a += 1) {
          const b = (a + 1) % 3, cc = (a + 2) % 3;
          if (g[a] >= n[a] || g[b] < 1 || g[cc] < 1 || g[b] >= n[b] || g[cc] >= n[cc]) continue;
          const d0 = val[q], d1 = val[q + step[a]];
          if (d0 < 0 === d1 < 0) continue;
          const base = g[0] + g[1] * n[0] + g[2] * n[0] * n[1];
          const v0 = cellVert[base - cstep[b] - cstep[cc]], v1 = cellVert[base - cstep[cc]];
          const v2 = cellVert[base], v3 = cellVert[base - cstep[b]];
          if (d0 < 0) idx.push(v0, v1, v2, v0, v2, v3);
          else idx.push(v0, v2, v1, v0, v3, v2);
        }
      }
    }
  }
  return finish(s, new Float32Array(pos), new Uint32Array(idx), cell);
}

/** Snap vertices onto the surface, then read normals and paint from the field. */
function finish(s: SdfScene, pos: Float32Array, idx: Uint32Array, cell: number): SdfMesh {
  const count = pos.length / 3;
  const nrm = new Float32Array(pos.length);
  const w = new Float32Array(count * s.slots);
  const tmp = new Float32Array(s.slots);
  const e = cell * 0.4;
  for (let v = 0; v < count; v += 1) {
    const o = v * 3;
    let x = pos[o], y = pos[o + 1], z = pos[o + 2];
    let nx = 0, ny = 0, nz = 1;
    for (let pass = 0; pass < 2; pass += 1) {
      nx = sample(s, x + e, y, z) - sample(s, x - e, y, z);
      ny = sample(s, x, y + e, z) - sample(s, x, y - e, z);
      nz = sample(s, x, y, z + e) - sample(s, x, y, z - e);
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      if (pass === 1) break;
      const d = Math.max(-cell, Math.min(cell, sample(s, x, y, z)));
      x -= nx * d; y -= ny * d; z -= nz * d;
    }
    pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
    nrm[o] = nx; nrm[o + 1] = ny; nrm[o + 2] = nz;
    sample(s, x, y, z, tmp);
    w.set(tmp, v * s.slots);
  }
  return { pos, nrm, idx, w, slots: s.slots };
}

const cache = new Map<string, SdfMesh>();

/** Sculpt once per key; shapes are colour-free so every palette reuses them. */
export function sculpt(key: string, cell: number, build: (s: SdfScene) => void): SdfMesh {
  let m = cache.get(key);
  if (!m) {
    const s = new SdfScene();
    build(s);
    m = meshScene(s, cell);
    cache.set(key, m);
  }
  return m;
}
