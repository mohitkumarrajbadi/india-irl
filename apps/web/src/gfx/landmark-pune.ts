import * as THREE from "three";
import { GeoBuilder } from "./geo";
import { box, type LandmarkBox, type LandmarkModel } from "./landmark-shared";

export function shaniwar(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  const W = 46;
  const H = 9;
  const wall = "#8a7a68";
  g.box(W - 6, 0.3, W - 6, "#6e8a4e", { pos: [0, 0.15, 0] });
  const crenel = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / 2.2);
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      g.box(1.1, 1.1, 1.1, wall, { pos: [x0 + (x1 - x0) * t, H + 0.55, z0 + (z1 - z0) * t] });
    }
  };
  box(boxes, 0, 0, -W / 2 + 1, W, H, 2, wall);
  box(boxes, W / 2 - 1, 0, 0, 2, H, W, wall);
  box(boxes, -W / 2 + 1, 0, 0, 2, H, W, wall);
  box(boxes, -W / 2 + 8.5, 0, W / 2 - 1, 17, H, 2, wall);
  box(boxes, W / 2 - 8.5, 0, W / 2 - 1, 17, H, 2, wall);
  box(boxes, 0, H - 2.4, W / 2 - 1, 12, 2.4, 2, wall);
  crenel(-W / 2, -W / 2 + 1, W / 2, -W / 2 + 1);
  crenel(-W / 2 + 1, -W / 2, -W / 2 + 1, W / 2);
  crenel(W / 2 - 1, -W / 2, W / 2 - 1, W / 2);
  crenel(-W / 2, W / 2 - 1, -6.5, W / 2 - 1);
  crenel(6.5, W / 2 - 1, W / 2, W / 2 - 1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.cyl(3.4, 3.8, H + 3, "#7d6e5c", { pos: [sx * (W / 2 - 1.5), (H + 3) / 2, sz * (W / 2 - 1.5)] }, 12);
      g.add(new THREE.SphereGeometry(3.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), "#6d5f50", { pos: [sx * (W / 2 - 1.5), H + 3, sz * (W / 2 - 1.5)] });
    }
  }
  for (const sx of [-1, 1]) g.cyl(3, 3.4, H + 4, "#85755f", { pos: [sx * 7.3, (H + 4) / 2, W / 2] }, 12);
  g.box(7, 7.5, 0.5, "#241a14", { pos: [0, 3.75, W / 2 - 0.6] });
  g.add(new THREE.CylinderGeometry(3.5, 3.5, 0.5, 14, 1, false, 0, Math.PI), "#241a14", { pos: [0, 7.5, W / 2 - 0.6], rot: [Math.PI / 2, 0, Math.PI / 2] });
  for (let i = -2; i <= 2; i += 1) for (let j = 0; j < 4; j += 1) g.cyl(0, 0.16, 0.5, "#b8b2a8", { pos: [i * 1.2, 1.6 + j * 1.5, W / 2 - 0.2], rot: [Math.PI / 2, 0, 0] }, 6);
  box(boxes, 0, 0, -6, 14, 8, 12, "#d6c3a6");
  g.box(15, 0.5, 13, "#6a4a30", { pos: [0, 8.2, -6] });
  return { boxes, details: g.build() };
}

export function infotechGate(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  box(boxes, -16, 0, 0, 7, 28, 7, "#2f6f8a", 1);
  box(boxes, 16, 0, 0, 7, 28, 7, "#2f6f8a", 1);
  g.box(40, 4.4, 6, "#e9e4d8", { pos: [0, 21, 0] });
  g.box(36, 2.2, 6.3, "#12202e", { pos: [0, 21, 0] });
  g.box(34, 0.5, 6.4, "#46d6c4", { pos: [0, 22.4, 0] });
  g.box(34, 0.5, 6.4, "#46d6c4", { pos: [0, 19.6, 0] });
  for (let i = -3; i <= 3; i += 1) g.box(1.6, 0.9, 6.5, "#7ff0df", { pos: [i * 4.6, 21, 0] });
  g.box(5, 3.2, 4, "#d8d0c0", { pos: [-7, 1.6, 8] });
  g.box(5, 3.2, 4, "#d8d0c0", { pos: [7, 1.6, 8] });
  g.box(5.4, 0.3, 4.4, "#b3261e", { pos: [-7, 3.3, 8] });
  g.box(5.4, 0.3, 4.4, "#b3261e", { pos: [7, 3.3, 8] });
  return { boxes, details: g.build() };
}
