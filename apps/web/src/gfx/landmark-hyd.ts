import * as THREE from "three";
import { GeoBuilder } from "./geo";
import { CHROME, GOLD, box, type LandmarkBox, type LandmarkModel } from "./landmark-shared";

export function charminar(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  const cream = "#e6d8bd";
  g.box(30, 0.6, 30, "#b7a98f", { pos: [0, 0.3, 0] });
  box(boxes, 0, 0.6, 0, 20, 17, 20, cream, 0);
  box(boxes, 0, 17.6, 0, 18, 3, 18, "#dccdb0", 0);
  for (const [dx, dz, ry] of [[0, 10.05, 0], [0, -10.05, 0], [10.05, 0, Math.PI / 2], [-10.05, 0, Math.PI / 2]] as const) {
    g.box(8.2, 11, 0.4, "#6b5240", { pos: [dx, 6.1, dz], rot: [0, ry, 0] });
    g.add(new THREE.CylinderGeometry(4.1, 4.1, 0.4, 16, 1, false, 0, Math.PI), "#6b5240", { pos: [dx, 11.6, dz], rot: [Math.PI / 2, ry, Math.PI / 2] });
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 10;
      const z = sz * 10;
      g.cyl(1.7, 2.1, 27, cream, { pos: [x, 14, z] }, 14);
      for (const y of [8, 15, 22]) g.cyl(2.5, 2.5, 0.7, "#d1c1a3", { pos: [x, y, z] }, 14);
      g.cyl(2.1, 2.1, 2.6, cream, { pos: [x, 28.6, z] }, 12);
      g.add(new THREE.SphereGeometry(2.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), "#f0e6d0", { pos: [x, 29.9, z] });
      g.sphere(0.45, GOLD, { pos: [x, 32.3, z] }, 8);
      for (let k = 0; k < 4; k += 1) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        g.cyl(0.18, 0.18, 2.4, cream, { pos: [x + Math.cos(a) * 1.7, 28.6, z + Math.sin(a) * 1.7] }, 6);
      }
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(new THREE.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), "#e9ddc3", { pos: [sx * 4.5, 20.7, sz * 4.5] });
    }
  }
  g.add(new THREE.SphereGeometry(3.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), "#e9ddc3", { pos: [0, 20.6, 0] });
  g.box(30, 0.7, 1, "#b8a07a", { pos: [0, 1.0, 15.2] });
  return { boxes, details: g.build() };
}

export function cyberTowers(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  box(boxes, 0, 0, 8, 38, 12, 14, "#9fb8c4", 1);
  box(boxes, -10, 0, -4, 16, 58, 16, "#4a7e99", 1);
  box(boxes, 10, 0, -4, 16, 48, 16, "#3c6b86", 1);
  box(boxes, -10, 58, -4, 11, 8, 11, "#4a7e99", 1);
  box(boxes, 10, 48, -4, 11, 8, 11, "#3c6b86", 1);
  g.add(new THREE.ConeGeometry(8.2, 12, 4), "#c9d6dc", { pos: [-10, 72, -4], rot: [0, Math.PI / 4, 0] });
  g.add(new THREE.ConeGeometry(8.2, 12, 4), "#c9d6dc", { pos: [10, 62, -4], rot: [0, Math.PI / 4, 0] });
  g.box(38, 0.5, 14.4, "#2f4a5a", { pos: [0, 12.2, 8] });
  g.cyl(0.3, 0.3, 8, CHROME, { pos: [-10, 82, -4] }, 6);
  for (let i = -3; i <= 3; i += 1) g.box(1.2, 11, 0.2, "#e2eff5", { pos: [i * 5.4, 6, 15.2] });
  return { boxes, details: g.build() };
}
