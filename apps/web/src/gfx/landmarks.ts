import * as THREE from "three";
import type { LandmarkKind } from "../world/types";
import { GeoBuilder } from "./geo";

/** A box that should get the lit-window building shader. Coordinates are local, unscaled. */
export type LandmarkBox = { x: number; y: number; z: number; w: number; h: number; d: number; color: number; style: 0 | 1 | 2 };

export type LandmarkModel = {
  boxes: LandmarkBox[];
  details: THREE.BufferGeometry;
};

const STONE = "#b9ab9a";
const STONE_D = "#8d8070";
const GOLD = "#d6a93a";
const DARK = "#2b2d33";
const hex = (s: string) => parseInt(s.slice(1), 16);

function box(boxes: LandmarkBox[], x: number, y: number, z: number, w: number, h: number, d: number, color: string, style: 0 | 1 | 2 = 0) {
  // y is the bottom of the box.
  boxes.push({ x, y, z, w, h, d, color: hex(color), style });
}

function vidhana(): LandmarkModel {
  const boxes: LandmarkBox[] = [];
  const g = new GeoBuilder();
  g.box(56, 1.2, 34, STONE_D, { pos: [0, 0.6, 0] });
  for (let i = 0; i < 5; i += 1) g.box(18 - i * 0.8, 0.28, 2.2, STONE, { pos: [0, 0.3 + i * 0.28, 17.8 - i * 0.7 + 1.6] });
  box(boxes, 0, 1.2, 0, 52, 13, 28, "#cbb8a2");
  box(boxes, 0, 14.2, 0, 42, 6, 22, "#bfae9a");
  // portico
  for (let i = -4; i <= 4; i += 1) g.cyl(0.8, 0.9, 12, "#d9ccb8", { pos: [i * 3.2, 7.2, 15.2] }, 12);
  g.box(30, 1.6, 4.4, "#cdbfa9", { pos: [0, 13.8, 15] });
  g.add(new THREE.CylinderGeometry(7, 7, 4.4, 3), "#cdbfa9", { pos: [0, 16.3, 15], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.45] });
  // dome stack
  g.cyl(7.4, 7.8, 4, "#cdbfa9", { pos: [0, 22.2, 0] }, 20);
  g.add(new THREE.SphereGeometry(6.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), "#bfb09c", { pos: [0, 24.2, 0] });
  g.cyl(0.5, 1.6, 3.5, GOLD, { pos: [0, 31.8, 0] }, 10);
  g.sphere(0.6, GOLD, { pos: [0, 34, 0] }, 8);
  // corner pavilions with small domes
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

function ecospace(): LandmarkModel {
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

function shaniwar(): LandmarkModel {
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
  // north, east, west walls solid; south wall has the gate gap
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
  // gate towers, the arch, and iron door spikes
  for (const sx of [-1, 1]) g.cyl(3, 3.4, H + 4, "#85755f", { pos: [sx * 7.3, (H + 4) / 2, W / 2] }, 12);
  g.box(7, 7.5, 0.5, "#241a14", { pos: [0, 3.75, W / 2 - 0.6] });
  g.add(new THREE.CylinderGeometry(3.5, 3.5, 0.5, 14, 1, false, 0, Math.PI), "#241a14", { pos: [0, 7.5, W / 2 - 0.6], rot: [Math.PI / 2, 0, Math.PI / 2] });
  for (let i = -2; i <= 2; i += 1) for (let j = 0; j < 4; j += 1) g.cyl(0, 0.16, 0.5, "#b8b2a8", { pos: [i * 1.2, 1.6 + j * 1.5, W / 2 - 0.2], rot: [Math.PI / 2, 0, 0] }, 6);
  box(boxes, 0, 0, -6, 14, 8, 12, "#d6c3a6");
  g.box(15, 0.5, 13, "#6a4a30", { pos: [0, 8.2, -6] });
  return { boxes, details: g.build() };
}

function infotechGate(): LandmarkModel {
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

function charminar(): LandmarkModel {
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

function cyberTowers(): LandmarkModel {
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

const CHROME = "#b0b6bc";

function cyberHub(): LandmarkModel {
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
    const dx = k * (len * 0.42 / 9);
    for (const side of [-1, 1]) {
      g.strut([px, top - 0.6 - k * 0.2, side * 0.5], [px - dx, 0.8, side * 4.6], 0.1, "#eae4d4");
      g.strut([px, top - 0.6 - k * 0.2, side * 0.5], [px + dx * 0.55, 0.8, side * 4.6], 0.1, "#eae4d4");
    }
  }
  return g.build();
}

const BUILDERS: Record<Exclude<LandmarkKind, "lake">, () => LandmarkModel> = {
  vidhana,
  ecospace,
  shaniwar,
  infotechGate,
  charminar,
  cyberTowers,
  cyberHub,
};

export function buildLandmark(kind: Exclude<LandmarkKind, "lake">): LandmarkModel {
  return BUILDERS[kind]();
}
