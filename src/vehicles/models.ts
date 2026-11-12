import * as THREE from "three";
import { GeoBuilder } from "../gfx/geo";

export type Model = {
  body: THREE.BufferGeometry;
  glass: THREE.BufferGeometry | null;
};

const DARK = "#17191d";
const RUBBER = "#101113";
const CHROME = "#9aa1a8";
const GLASS = "#8fb4c9";
const WHITE = "#ffffff";

function wheel(b: GeoBuilder, x: number, z: number, r: number, w: number, hub = CHROME): void {
  b.cyl(r, r, w, RUBBER, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 14);
  b.cyl(r * 0.5, r * 0.5, w + 0.02, hub, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 8);
}

/** Auto-rickshaw. `livery` is [lower body, canopy]. */
export function buildAuto(livery: [string, string]): Model {
  const [low, up] = livery;
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.box(1.12, 0.1, 2.15, DARK, { pos: [0, 0.32, -0.1] });
  // front cowl and nose
  b.box(0.62, 0.5, 0.62, low, { pos: [0, 0.62, 0.98] });
  b.box(0.5, 0.2, 0.3, low, { pos: [0, 0.38, 1.22] });
  b.sphere(0.07, "#fff6c9", { pos: [0, 0.78, 1.3], scale: [1, 1, 0.6] }, 8);
  b.box(0.3, 0.05, 0.55, low, { pos: [0, 0.57, 1.12], rot: [0, 0, 0] });
  // rear passenger body
  b.box(1.26, 0.42, 0.98, low, { pos: [0, 0.62, -0.55] });
  b.box(1.1, 0.12, 0.8, "#2a2f36", { pos: [0, 0.88, -0.55] });
  b.box(1.1, 0.34, 0.1, "#2a2f36", { pos: [0, 1.06, -0.98] });
  // driver seat + handlebar
  b.box(0.52, 0.1, 0.4, "#2a2f36", { pos: [0, 0.62, 0.28] });
  b.box(0.52, 0.28, 0.08, "#2a2f36", { pos: [0, 0.8, 0.07] });
  b.box(0.5, 0.035, 0.035, CHROME, { pos: [0, 1.05, 0.62] });
  b.cyl(0.02, 0.02, 0.5, CHROME, { pos: [0, 0.82, 0.62] }, 6);
  // canopy
  b.box(1.34, 0.07, 2.1, up, { pos: [0, 1.74, -0.12] });
  b.box(1.2, 0.06, 0.4, up, { pos: [0, 1.7, 0.98], rot: [0.28, 0, 0] });
  for (const x of [-0.6, 0.6]) {
    b.box(0.05, 1.05, 0.05, low, { pos: [x, 1.2, -1.04] });
    b.box(0.05, 1.05, 0.05, low, { pos: [x * 0.78, 1.2, 0.62], rot: [0.12, 0, 0] });
  }
  b.box(1.2, 0.5, 0.05, DARK, { pos: [0, 1.32, -1.08] });
  b.box(0.04, 0.5, 0.05, up, { pos: [0, 1.32, -1.1] });
  g.box(0.95, 0.52, 0.03, GLASS, { pos: [0, 1.38, 0.72], rot: [0.12, 0, 0] });
  wheel(b, 0, 1.0, 0.26, 0.12);
  wheel(b, 0.6, -0.78, 0.27, 0.13);
  wheel(b, -0.6, -0.78, 0.27, 0.13);
  b.box(0.34, 0.04, 0.7, low, { pos: [0, 0.6, 1.0] });
  return { body: b.build(), glass: g.build() };
}

/** Scooter/commuter bike. Body panels are white so instance color tints them. */
export function buildBike(): Model {
  const b = new GeoBuilder();
  const wr = 0.3;
  wheel(b, 0, 0.62, wr, 0.1);
  wheel(b, 0, -0.62, wr, 0.11);
  b.box(0.2, 0.34, 0.9, WHITE, { pos: [0, 0.5, 0.05] });
  b.box(0.24, 0.24, 0.5, WHITE, { pos: [0, 0.62, -0.5], rot: [-0.18, 0, 0] });
  b.box(0.26, 0.1, 0.62, "#25282e", { pos: [0, 0.78, -0.3] });
  b.box(0.26, 0.09, 0.42, "#25282e", { pos: [0, 0.8, -0.74] });
  b.box(0.3, 0.45, 0.1, WHITE, { pos: [0, 0.52, 0.55], rot: [-0.25, 0, 0] });
  b.box(0.16, 0.05, 0.3, WHITE, { pos: [0, 0.36, 0.78] });
  b.cyl(0.018, 0.018, 0.6, CHROME, { pos: [0, 0.72, 0.58], rot: [-0.25, 0, 0] }, 6);
  b.box(0.62, 0.03, 0.03, "#1b1b1b", { pos: [0, 1.0, 0.5] });
  b.cyl(0.07, 0.07, 0.1, "#fff3bd", { pos: [0, 0.98, 0.64], rot: [Math.PI / 2, 0, 0] }, 8);
  b.cyl(0.04, 0.05, 0.55, CHROME, { pos: [0.16, 0.34, -0.55], rot: [Math.PI / 2, 0, 0] }, 8);
  b.box(0.1, 0.05, 0.03, "#c11", { pos: [0, 0.7, -0.98] });
  return { body: b.build(), glass: null };
}

/** Hatchback taxi. Lower body is white-tinted by default, `livery` overrides for the player cab. */
export function buildCar(livery: [string, string] | null): Model {
  const low = livery ? livery[0] : WHITE;
  const up = livery ? livery[1] : WHITE;
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.box(1.72, 0.52, 4.0, low, { pos: [0, 0.64, 0] });
  b.box(1.66, 0.12, 4.0, DARK, { pos: [0, 0.34, 0] });
  b.box(1.6, 0.08, 1.15, low, { pos: [0, 0.94, 1.38], rot: [0.05, 0, 0] });
  b.box(1.4, 0.1, 0.3, DARK, { pos: [0, 0.97, 0.66] });
  b.box(1.4, 0.06, 0.5, DARK, { pos: [0, 0.97, -1.05] });
  b.box(1.5, 0.06, 1.5, up, { pos: [0, 1.36, -0.2] });
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.88, 0.44]) b.box(0.05, 0.4, 0.07, up, { pos: [x, 1.12, z] });
  }
  g.box(1.54, 0.34, 1.66, GLASS, { pos: [0, 1.12, -0.18] });
  b.box(1.76, 0.18, 0.18, DARK, { pos: [0, 0.42, 2.0] });
  b.box(1.76, 0.18, 0.18, DARK, { pos: [0, 0.42, -2.0] });
  b.box(0.3, 0.1, 0.05, "#fff3bd", { pos: [0.6, 0.78, 2.01] });
  b.box(0.3, 0.1, 0.05, "#fff3bd", { pos: [-0.6, 0.78, 2.01] });
  b.box(0.3, 0.1, 0.05, "#c11", { pos: [0.6, 0.8, -2.01] });
  b.box(0.3, 0.1, 0.05, "#c11", { pos: [-0.6, 0.8, -2.01] });
  if (livery) b.box(0.55, 0.12, 0.2, "#fff3bd", { pos: [0, 1.46, -0.2] });
  for (const x of [-0.84, 0.84]) {
    wheel(b, x, 1.25, 0.31, 0.2);
    wheel(b, x, -1.25, 0.31, 0.2);
  }
  return { body: b.build(), glass: g.build() };
}

export function buildBus(): Model {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.box(2.5, 1.5, 10.2, WHITE, { pos: [0, 1.05, 0] });
  b.box(2.5, 0.55, 10.2, "#e9e9e0", { pos: [0, 2.05, 0] });
  b.box(2.52, 0.18, 10.22, "#c9c9c0", { pos: [0, 1.55, 0] });
  b.box(2.4, 0.08, 10.0, "#d8d8d0", { pos: [0, 2.35, 0] });
  g.box(2.54, 0.7, 9.4, "#7d99aa", { pos: [0, 1.95, -0.2] });
  g.box(2.3, 0.85, 0.05, "#7d99aa", { pos: [0, 1.85, 5.11] });
  b.box(2.3, 0.18, 0.05, "#111", { pos: [0, 2.45, 5.12] });
  b.box(0.45, 0.22, 0.05, "#fff3bd", { pos: [0.85, 0.78, 5.12] });
  b.box(0.45, 0.22, 0.05, "#fff3bd", { pos: [-0.85, 0.78, 5.12] });
  b.box(2.4, 0.22, 0.12, DARK, { pos: [0, 0.34, 5.1] });
  for (const z of [3.4, -3.2, -4.3]) {
    for (const x of [-1.2, 1.2]) wheel(b, x, z, 0.5, 0.28);
  }
  return { body: b.build(), glass: g.build() };
}

export function buildTruck(): Model {
  const b = new GeoBuilder();
  b.box(2.3, 1.5, 1.7, WHITE, { pos: [0, 1.25, 2.3] });
  b.box(2.2, 0.62, 0.05, DARK, { pos: [0, 1.55, 3.16] });
  b.box(2.5, 0.2, 6.2, DARK, { pos: [0, 0.62, -0.7] });
  b.box(2.5, 1.6, 5.5, "#d89a2b", { pos: [0, 1.62, -0.9] });
  b.box(2.56, 0.16, 5.56, "#a5361f", { pos: [0, 2.46, -0.9] });
  b.box(2.56, 0.16, 5.56, "#2a6aa3", { pos: [0, 1.1, -0.9] });
  b.box(1.9, 0.38, 0.05, "#f2d04a", { pos: [0, 2.0, -3.68] });
  b.box(1.8, 0.1, 0.05, "#7a1b1b", { pos: [0, 2.0, -3.7] });
  b.box(0.4, 0.15, 0.05, "#fff3bd", { pos: [0.75, 0.72, 3.17] });
  b.box(0.4, 0.15, 0.05, "#fff3bd", { pos: [-0.75, 0.72, 3.17] });
  for (const z of [2.3, -1.4, -2.9]) {
    for (const x of [-1.1, 1.1]) wheel(b, x, z, 0.5, 0.3);
  }
  return { body: b.build(), glass: null };
}

export const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.12,
  metalness: 0.2,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});
