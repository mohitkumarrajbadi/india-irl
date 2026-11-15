import * as THREE from "three";
import { GeoBuilder } from "./geo";
import { CHROME, box, type LandmarkBox, type LandmarkModel } from "./landmark-shared";

export function cyberHub(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  g.box(56, 0.4, 44, "#c9c1b2", { pos: [0, 0.2, 0] });
  g.cyl(10, 10, 0.5, "#8a8478", { pos: [0, 0.5, 4] }, 28);
  const colors = ["#e0527c", "#f2c230", "#2a9d8f", "#e8913c", "#6a4fb0", "#3b82c4", "#d9d0bd", "#c6483a"];
  for (let i = 0; i < 8; i += 1) {
    const side = i % 4;
    const slot = Math.floor(i / 4);
    const t = (slot + 0.5) / 2 - 0.5;
    const x = side === 0 ? t * 36 : side === 1 ? 24 : side === 2 ? -t * 36 : -24;
    const z = side === 0 ? -17 : side === 1 ? t * 22 + 2 : side === 2 ? 19 : -t * 22 + 2;
    const horizontal = side % 2 === 0;
    box(boxes, x, 0, z, horizontal ? 16 : 7, 7 + (i % 3) * 2.2, horizontal ? 7 : 16, colors[i], 2);
  }
  box(boxes, 0, 0, -20, 14, 50, 9, "#2f6fa3", 1);
  g.torus(7.5, 0.55, "#e8f4ff", { pos: [0, 10.6, 4], rot: [0, 0, 0] });
  g.torus(5.6, 0.4, "#46d6c4", { pos: [0, 10.6, 4], rot: [0, 0, 0], scale: [1, 1, 1] });
  g.cyl(0.35, 0.35, 10, CHROME, { pos: [0, 5.5, 4] }, 8);
  g.sphere(1.3, "#f2c230", { pos: [0, 10.6, 4] }, 12);
  for (const a of [0, 1, 2, 3, 4, 5]) {
    const ang = (a / 6) * Math.PI * 2;
    g.cyl(0.12, 0.12, 5, "#2a2a2a", { pos: [Math.cos(ang) * 12, 2.5, 4 + Math.sin(ang) * 12] }, 6);
    g.sphere(0.35, "#ffe9a8", { pos: [Math.cos(ang) * 12, 5.2, 4 + Math.sin(ang) * 12] }, 6);
  }
  return { boxes, details: g.build() };
}

/** Cable-stayed bridge. `len` is the span across the water along X. */
export function cableBridge(len: number): THREE.BufferGeometry {
  const g = new GeoBuilder();
  g.box(len, 0.6, 10, "#5a5d63", { pos: [0, 0.35, 0] });
  g.box(len, 0.12, 0.22, "#e4d7a1", { pos: [0, 0.68, 0] });
  const px = len * 0.1;
  const top = 34;
  g.strut([px, 0.4, -4.6], [px, top, -0.6], 1.3, "#d8d2c6");
  g.strut([px, 0.4, 4.6], [px, top, 0.6], 1.3, "#d8d2c6");
  g.box(1.8, 1.2, 1.8, "#d8d2c6", { pos: [px, top, 0] });
  for (let k = 1; k <= 9; k += 1) {
    const dx = k * ((len * 0.42) / 9);
    for (const side of [-1, 1]) {
      g.strut([px, top - 0.6 - k * 0.2, side * 0.5], [px - dx, 0.8, side * 4.6], 0.1, "#eae4d4");
      g.strut([px, top - 0.6 - k * 0.2, side * 0.5], [px + dx * 0.55, 0.8, side * 4.6], 0.1, "#eae4d4");
    }
  }
  return g.build();
}
