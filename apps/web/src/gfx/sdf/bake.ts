/**
 * Paint an SDF Surface-Nets mesh into a Three BufferGeometry.
 * Shape is colour-free; palette slots are blended per vertex.
 */
import * as THREE from "three";
import type { SdfMesh } from "./nets.ts";

const tmp = new THREE.Color();

/** Copy sculpted mesh + palette → vertex-coloured geometry safe to dispose. */
export function bakeSdf(m: SdfMesh, palette: readonly THREE.ColorRepresentation[]): THREE.BufferGeometry {
  const n = m.pos.length / 3;
  const slots = m.slots;
  const cols = new Array<THREE.Color>(slots);
  for (let s = 0; s < slots; s += 1) {
    cols[s] = new THREE.Color(palette[s] ?? palette[0] ?? "#ffffff");
  }

  const color = new Float32Array(n * 3);
  for (let v = 0; v < n; v += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    const o = v * slots;
    for (let s = 0; s < slots; s += 1) {
      const w = m.w[o + s];
      if (w <= 0) continue;
      tmp.copy(cols[s]);
      r += tmp.r * w;
      g += tmp.g * w;
      b += tmp.b * w;
    }
    color[v * 3] = r;
    color[v * 3 + 1] = g;
    color[v * 3 + 2] = b;
  }

  const geo = new THREE.BufferGeometry();
  // Slice so dispose() cannot free the sculpt cache buffers.
  geo.setAttribute("position", new THREE.BufferAttribute(m.pos.slice(), 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(m.nrm.slice(), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geo.setIndex(new THREE.BufferAttribute(m.idx.slice(), 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
