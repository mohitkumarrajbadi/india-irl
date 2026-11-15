import * as THREE from "three";
import { GeoBuilder } from "./geo";
import { DARK, GOLD, STONE, STONE_D, box, type LandmarkBox, type LandmarkModel } from "./landmark-shared";

export function vidhana(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  g.box(56, 1.2, 34, STONE_D, { pos: [0, 0.6, 0] });
  for (let i = 0; i < 5; i += 1) g.box(18 - i * 0.8, 0.28, 2.2, STONE, { pos: [0, 0.3 + i * 0.28, 17.8 - i * 0.7 + 1.6] });
  box(boxes, 0, 1.2, 0, 52, 13, 28, "#cbb8a2");
  box(boxes, 0, 14.2, 0, 42, 6, 22, "#bfae9a");
  for (let i = -4; i <= 4; i += 1) g.cyl(0.8, 0.9, 12, "#d9ccb8", { pos: [i * 3.2, 7.2, 15.2] }, 12);
  g.box(30, 1.6, 4.4, "#cdbfa9", { pos: [0, 13.8, 15] });
  g.add(new THREE.CylinderGeometry(7, 7, 4.4, 3), "#cdbfa9", { pos: [0, 16.3, 15], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.45] });
  g.cyl(7.4, 7.8, 4, "#cdbfa9", { pos: [0, 22.2, 0] }, 20);
  g.add(new THREE.SphereGeometry(6.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), "#bfb09c", { pos: [0, 24.2, 0] });
  g.cyl(0.5, 1.6, 3.5, GOLD, { pos: [0, 31.8, 0] }, 10);
  g.sphere(0.6, GOLD, { pos: [0, 34, 0] }, 8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(boxes, sx * 24, 1.2, sz * 12.5, 8, 15, 8, "#c4b19b");
      g.add(new THREE.SphereGeometry(3.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), "#bfb09c", { pos: [sx * 24, 16.2, sz * 12.5] });
    }
  }
  g.box(40, 0.8, 0.2, DARK, { pos: [0, 5.2, 14.1] });
  g.box(40, 0.8, 0.2, DARK, { pos: [0, 9.2, 14.1] });
  return { boxes, details: g.build() };
}

export function ecospace(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  box(boxes, 0, 0, 0, 40, 7, 40, "#d9d0bd", 0);
  g.box(34, 0.4, 34, "#4f8a45", { pos: [0, 7.2, 0] });
  box(boxes, -10, 7, 0, 13, 58, 24, "#4f8aa6", 1);
  box(boxes, 10, 7, 0, 13, 66, 24, "#3f7490", 1);
  box(boxes, 0, 34, 0, 10, 4, 8, "#a8c2d0", 1);
  g.box(10, 0.4, 8.4, DARK, { pos: [0, 38.2, 0] });
  g.cyl(0.4, 0.4, 7, "#d33", { pos: [10, 76.5, 0] }, 6);
  g.box(8, 1.2, 8, "#33383f", { pos: [-10, 65.6, 0] });
  g.box(6, 0.1, 4, "#e8e4d8", { pos: [10, 73.2, 0] });
  return { boxes, details: g.build() };
}
