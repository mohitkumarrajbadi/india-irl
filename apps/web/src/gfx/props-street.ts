import * as THREE from "three";
import { GeoBuilder } from "./geo";
import { CHROME, matte } from "./surface";

const DARK = matte("#23262b");

/** Pole with a cantilever arm toward local +Z. The lamp head is a separate emissive mesh. */
export function lampPost(): { post: THREE.BufferGeometry; head: THREE.BufferGeometry } {
  const g = new GeoBuilder();
  g.cyl(0.07, 0.11, 7.2, matte("#4a4f57", 0.7), { pos: [0, 3.6, 0] }, 10);
  g.roundBox(0.14, 0.14, 1.9, matte("#4a4f57", 0.7), { pos: [0, 7.15, 0.85] }, 0.04, 2);
  g.sphere(0.18, matte("#4a4f57", 0.7), { pos: [0, 0.15, 0] }, 10);
  const h = new GeoBuilder();
  h.roundBox(0.34, 0.1, 0.8, "#ffffff", { pos: [0, 7.02, 1.7] }, 0.04, 2);
  return { post: g.build(), head: h.build() };
}

/** Bus shelter. Open side faces local +Z (the road). */
export function busStop(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(3.4, 0.12, 1.6, "#2a6a8a", { pos: [0, 2.5, 0] }, 0.04, 2);
  g.roundBox(3.2, 2.3, 0.08, { color: "#9fc4d6", rough: 0.2, metal: 0.1 }, { pos: [0, 1.3, -0.7] }, 0.03, 2);
  for (const x of [-1.6, 1.6] as const) {
    for (const z of [0.7, -0.7] as const) {
      g.cyl(0.05, 0.05, 2.4, DARK, { pos: [x, 1.2, z] }, 8);
    }
  }
  g.roundBox(2.8, 0.08, 0.5, "#7b5a3a", { pos: [0, 0.55, -0.45] }, 0.03, 2);
  g.roundBox(0.5, 1.4, 0.08, "#e2b64a", { pos: [1.9, 1.2, 0.2] }, 0.04, 2);
  g.cyl(0.06, 0.06, 2.6, CHROME, { pos: [1.9, 1.3, 0.2] }, 8);
  return g.build();
}

/** Chai tapri: counter, kettle, umbrella, stools. White vertex parts take the instance tint. */
export function chaiStall(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.roundBox(2.0, 0.9, 0.9, "#8a5a34", { pos: [0, 0.45, 0] }, 0.08, 3);
  g.roundBox(2.1, 0.06, 1.0, "#d9c9a8", { pos: [0, 0.93, 0] }, 0.03, 2);
  g.roundBox(2.05, 0.08, 0.08, "#6a4028", { pos: [0, 0.88, 0.46] }, 0.02, 2);
  g.cyl(0.14, 0.18, 0.28, CHROME, { pos: [-0.5, 1.12, 0] }, 12);
  g.cyl(0.05, 0.05, 0.12, matte("#8a8a8a"), { pos: [-0.5, 1.3, 0] }, 8);
  g.cyl(0.22, 0.26, 0.2, matte("#3a3a3a"), { pos: [0.15, 1.05, 0.1] }, 12);
  for (let i = 0; i < 4; i += 1) g.cyl(0.04, 0.04, 0.12, "#f4f0e6", { pos: [0.5 + i * 0.13, 0.99, 0.2] }, 8);
  g.cyl(0.04, 0.04, 2.2, CHROME, { pos: [0.7, 1.1, -0.35] }, 8);
  g.add(new THREE.ConeGeometry(1.7, 0.55, 16), "#ffffff", { pos: [0.7, 2.28, -0.35] });
  for (const [x, z] of [
    [-1.5, 0.35],
    [-1.5, -0.35],
    [1.55, 0.35],
  ] as const) {
    g.cyl(0.18, 0.2, 0.06, "#c1121f", { pos: [x, 0.42, z] }, 10);
    g.cyl(0.04, 0.05, 0.4, "#8a2020", { pos: [x, 0.2, z] }, 6);
  }
  g.sphere(0.22, "#5a3a22", { pos: [-0.9, 0.18, -0.55] }, 10);
  return g.build();
}

export function glowDisc(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 256);
  // Warm sodium wash — keep the core amber (not near-white) so additive pools don't plate the asphalt
  const grd = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, "rgba(255,190,110,0.85)");
  grd.addColorStop(0.18, "rgba(255,160,70,0.55)");
  grd.addColorStop(0.4, "rgba(230,130,50,0.28)");
  grd.addColorStop(0.7, "rgba(200,100,40,0.08)");
  grd.addColorStop(1, "rgba(180,90,30,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
