import * as THREE from "three";
import { GeoBuilder } from "../gfx/geo";

export type Model = {
  body: THREE.BufferGeometry;
  glass: THREE.BufferGeometry | null;
};

export type BuildOpts = {
  /** Bake a seated driver (and sometimes a pillion) into the mesh — for traffic only. */
  occupied?: boolean;
};

const DARK = "#17191d";
const RUBBER = "#101113";
const CHROME = "#9aa1a8";
const GLASS = "#8fb4c9";
const WHITE = "#ffffff";

const SKINS = ["#f0c9a0", "#e2ac7b", "#c98d5c", "#b07445", "#955c36", "#7a4727"] as const;
const TOPS = ["#1d4e89", "#b3261e", "#f2c230", "#1f7a3a", "#6a1b4d", "#151515", "#d9e3df", "#e07a3d"] as const;
const BOTTOMS = ["#243044", "#151515", "#4a4036", "#1f3a5f", "#d8cfb8"] as const;
const HAIRS = ["#16100c", "#2a1a10", "#4a2f1c"] as const;

function wheel(b: GeoBuilder, x: number, z: number, r: number, w: number, hub = CHROME): void {
  b.cyl(r, r, w, RUBBER, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 14);
  b.cyl(r * 0.55, r * 0.55, w + 0.02, hub, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 8);
  b.cyl(r * 0.18, r * 0.18, w + 0.04, DARK, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 6);
}

/** Compact seated Indian figure for traffic vehicles (+X left, +Z forward). */
function seated(
  b: GeoBuilder,
  x: number,
  y: number,
  z: number,
  seed: number,
  opts: { bike?: boolean; lean?: number } = {},
): void {
  const skin = SKINS[seed % SKINS.length];
  const top = TOPS[(seed * 3) % TOPS.length];
  const bottom = BOTTOMS[(seed * 5) % BOTTOMS.length];
  const hair = HAIRS[(seed * 7) % HAIRS.length];
  const lean = opts.lean ?? 0;
  const s = opts.bike ? 0.92 : 1;
  // hips / torso
  b.box(0.34 * s, 0.28 * s, 0.28 * s, bottom, { pos: [x, y, z + lean] });
  b.box(0.36 * s, 0.42 * s, 0.22 * s, top, { pos: [x, y + 0.32 * s, z - 0.02 + lean] });
  // head + hair
  b.sphere(0.12 * s, skin, { pos: [x, y + 0.58 * s, z + 0.02 + lean] }, 8);
  b.sphere(0.125 * s, hair, { pos: [x, y + 0.62 * s, z - 0.01 + lean], scale: [1, 0.85, 1.05] }, 8);
  // arms on wheel / resting
  if (opts.bike) {
    b.capsule(0.035 * s, 0.22 * s, skin, { pos: [x + 0.16 * s, y + 0.38 * s, z + 0.22], rot: [0.9, 0, 0.35] });
    b.capsule(0.035 * s, 0.22 * s, skin, { pos: [x - 0.16 * s, y + 0.38 * s, z + 0.22], rot: [0.9, 0, -0.35] });
  } else {
    b.capsule(0.038 * s, 0.2 * s, skin, { pos: [x + 0.2 * s, y + 0.28 * s, z + 0.12], rot: [0.55, 0, 0.2] });
    b.capsule(0.038 * s, 0.2 * s, skin, { pos: [x - 0.2 * s, y + 0.28 * s, z + 0.12], rot: [0.55, 0, -0.2] });
  }
  // thighs folded
  b.box(0.12 * s, 0.1 * s, 0.32 * s, bottom, { pos: [x + 0.1 * s, y - 0.02, z + 0.18] });
  b.box(0.12 * s, 0.1 * s, 0.32 * s, bottom, { pos: [x - 0.1 * s, y - 0.02, z + 0.18] });
}

function plate(b: GeoBuilder, z: number, y: number): void {
  b.box(0.42, 0.12, 0.03, "#f4f0e6", { pos: [0, y, z] });
  b.box(0.38, 0.08, 0.02, "#1d4e89", { pos: [0, y, z + 0.01] });
}

/** Auto-rickshaw. `livery` is [lower body, canopy]. */
export function buildAuto(livery: [string, string], opts: BuildOpts = {}): Model {
  const [low, up] = livery;
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.box(1.12, 0.1, 2.15, DARK, { pos: [0, 0.32, -0.1] });
  // front cowl and nose — more rounded Indian auto silhouette
  b.box(0.68, 0.52, 0.62, low, { pos: [0, 0.64, 0.98] });
  b.box(0.52, 0.22, 0.32, low, { pos: [0, 0.4, 1.24] });
  b.sphere(0.09, "#fff6c9", { pos: [0, 0.82, 1.32], scale: [1.2, 1, 0.55] }, 8);
  b.box(0.34, 0.06, 0.55, low, { pos: [0, 0.58, 1.14] });
  // side panels with yellow stripe
  b.box(1.28, 0.44, 1.0, low, { pos: [0, 0.64, -0.55] });
  b.box(1.3, 0.08, 1.0, "#f2c230", { pos: [0, 0.86, -0.55] });
  b.box(1.12, 0.12, 0.82, "#2a2f36", { pos: [0, 0.9, -0.55] });
  b.box(1.12, 0.36, 0.1, "#2a2f36", { pos: [0, 1.08, -0.98] });
  // driver seat + handlebar
  b.box(0.52, 0.1, 0.4, "#2a2f36", { pos: [0, 0.62, 0.28] });
  b.box(0.52, 0.28, 0.08, "#2a2f36", { pos: [0, 0.8, 0.07] });
  b.box(0.52, 0.035, 0.035, CHROME, { pos: [0, 1.05, 0.62] });
  b.cyl(0.02, 0.02, 0.5, CHROME, { pos: [0, 0.82, 0.62] }, 6);
  // canopy with slight curve suggestion
  b.box(1.36, 0.07, 2.12, up, { pos: [0, 1.76, -0.12] });
  b.box(1.22, 0.06, 0.42, up, { pos: [0, 1.72, 0.98], rot: [0.28, 0, 0] });
  for (const x of [-0.62, 0.62]) {
    b.box(0.05, 1.08, 0.05, low, { pos: [x, 1.22, -1.04] });
    b.box(0.05, 1.08, 0.05, low, { pos: [x * 0.78, 1.22, 0.62], rot: [0.12, 0, 0] });
  }
  b.box(1.22, 0.52, 0.05, DARK, { pos: [0, 1.34, -1.08] });
  b.box(0.05, 0.52, 0.05, up, { pos: [0, 1.34, -1.1] });
  // side mirrors
  b.box(0.08, 0.06, 0.12, CHROME, { pos: [0.42, 1.15, 0.9] });
  b.box(0.08, 0.06, 0.12, CHROME, { pos: [-0.42, 1.15, 0.9] });
  g.box(0.95, 0.52, 0.03, GLASS, { pos: [0, 1.4, 0.72], rot: [0.12, 0, 0] });
  wheel(b, 0, 1.0, 0.26, 0.12);
  wheel(b, 0.6, -0.78, 0.27, 0.13);
  wheel(b, -0.6, -0.78, 0.27, 0.13);
  b.box(0.34, 0.04, 0.7, low, { pos: [0, 0.6, 1.0] });
  plate(b, -1.12, 0.55);
  if (opts.occupied) {
    seated(b, 0, 0.78, 0.28, 2);
    // occasional rear passenger silhouettes
    seated(b, 0.26, 0.72, -0.52, 5);
  }
  return { body: b.build(), glass: g.build() };
}

/** Scooter/commuter bike. Body panels are white so instance color tints them. */
export function buildBike(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const wr = 0.3;
  wheel(b, 0, 0.62, wr, 0.1);
  wheel(b, 0, -0.62, wr, 0.11);
  // floorboard + body panels
  b.box(0.22, 0.08, 0.7, "#25282e", { pos: [0, 0.38, 0.05] });
  b.box(0.2, 0.34, 0.9, WHITE, { pos: [0, 0.5, 0.05] });
  b.box(0.26, 0.26, 0.52, WHITE, { pos: [0, 0.64, -0.5], rot: [-0.18, 0, 0] });
  b.box(0.28, 0.1, 0.62, "#25282e", { pos: [0, 0.8, -0.3] });
  b.box(0.28, 0.1, 0.42, "#25282e", { pos: [0, 0.82, -0.74] });
  // front apron
  b.box(0.32, 0.48, 0.1, WHITE, { pos: [0, 0.54, 0.55], rot: [-0.25, 0, 0] });
  b.box(0.18, 0.05, 0.32, WHITE, { pos: [0, 0.36, 0.78] });
  b.cyl(0.018, 0.018, 0.62, CHROME, { pos: [0, 0.74, 0.58], rot: [-0.25, 0, 0] }, 6);
  b.box(0.64, 0.03, 0.03, "#1b1b1b", { pos: [0, 1.02, 0.5] });
  b.cyl(0.07, 0.07, 0.1, "#fff3bd", { pos: [0, 1.0, 0.64], rot: [Math.PI / 2, 0, 0] }, 8);
  // exhaust + mirror + indicator
  b.cyl(0.04, 0.05, 0.55, CHROME, { pos: [0.16, 0.34, -0.55], rot: [Math.PI / 2, 0, 0] }, 8);
  b.box(0.06, 0.08, 0.04, CHROME, { pos: [0.22, 1.05, 0.48] });
  b.box(0.06, 0.08, 0.04, CHROME, { pos: [-0.22, 1.05, 0.48] });
  b.box(0.1, 0.05, 0.03, "#c11", { pos: [0, 0.72, -0.98] });
  b.box(0.08, 0.04, 0.03, "#f2c230", { pos: [0.14, 0.7, 0.58] });
  b.box(0.08, 0.04, 0.03, "#f2c230", { pos: [-0.14, 0.7, 0.58] });
  if (opts.occupied) {
    seated(b, 0, 0.82, -0.02, 3, { bike: true });
    // common Indian pillion rider
    seated(b, 0, 0.84, -0.55, 8, { bike: true, lean: 0.02 });
  }
  return { body: b.build(), glass: null };
}

/** Hatchback taxi. Lower body is white-tinted by default, `livery` overrides for the player cab. */
export function buildCar(livery: [string, string] | null, opts: BuildOpts = {}): Model {
  const low = livery ? livery[0] : WHITE;
  const up = livery ? livery[1] : WHITE;
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  // body with slight belt-line
  b.box(1.72, 0.52, 4.0, low, { pos: [0, 0.64, 0] });
  b.box(1.66, 0.12, 4.0, DARK, { pos: [0, 0.34, 0] });
  b.box(1.74, 0.06, 3.9, "#2a2f36", { pos: [0, 0.92, 0] });
  b.box(1.6, 0.08, 1.15, low, { pos: [0, 0.96, 1.38], rot: [0.05, 0, 0] });
  b.box(1.4, 0.1, 0.3, DARK, { pos: [0, 0.99, 0.66] });
  b.box(1.4, 0.06, 0.5, DARK, { pos: [0, 0.99, -1.05] });
  // roof
  b.box(1.5, 0.08, 1.55, up, { pos: [0, 1.38, -0.2] });
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.88, 0.44]) b.box(0.05, 0.42, 0.07, up, { pos: [x, 1.14, z] });
  }
  g.box(1.54, 0.36, 1.66, GLASS, { pos: [0, 1.14, -0.18] });
  // bumpers + lights
  b.box(1.76, 0.18, 0.18, DARK, { pos: [0, 0.42, 2.0] });
  b.box(1.76, 0.18, 0.18, DARK, { pos: [0, 0.42, -2.0] });
  b.box(0.32, 0.1, 0.05, "#fff3bd", { pos: [0.6, 0.78, 2.01] });
  b.box(0.32, 0.1, 0.05, "#fff3bd", { pos: [-0.6, 0.78, 2.01] });
  b.box(0.32, 0.1, 0.05, "#c11", { pos: [0.6, 0.8, -2.01] });
  b.box(0.32, 0.1, 0.05, "#c11", { pos: [-0.6, 0.8, -2.01] });
  // door handles
  b.box(0.08, 0.03, 0.04, CHROME, { pos: [0.88, 0.78, 0.35] });
  b.box(0.08, 0.03, 0.04, CHROME, { pos: [-0.88, 0.78, 0.35] });
  b.box(0.08, 0.03, 0.04, CHROME, { pos: [0.88, 0.78, -0.55] });
  b.box(0.08, 0.03, 0.04, CHROME, { pos: [-0.88, 0.78, -0.55] });
  if (livery) {
    b.box(0.55, 0.12, 0.2, "#fff3bd", { pos: [0, 1.48, -0.2] });
    b.box(0.08, 0.08, 0.08, "#c11", { pos: [0, 1.56, -0.2] });
  }
  plate(b, 2.05, 0.5);
  plate(b, -2.05, 0.5);
  for (const x of [-0.84, 0.84]) {
    wheel(b, x, 1.25, 0.31, 0.2);
    wheel(b, x, -1.25, 0.31, 0.2);
  }
  if (opts.occupied) {
    // RHD: driver on −X (right when +X is left)
    seated(b, -0.38, 0.72, 0.28, 4);
    seated(b, 0.38, 0.72, -0.55, 9);
  }
  return { body: b.build(), glass: g.build() };
}

export function buildBus(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  // city bus body with stripe
  b.box(2.5, 1.5, 10.2, WHITE, { pos: [0, 1.05, 0] });
  b.box(2.52, 0.22, 10.22, "#1d4e89", { pos: [0, 0.55, 0] });
  b.box(2.52, 0.14, 10.22, "#f2c230", { pos: [0, 1.55, 0] });
  b.box(2.5, 0.55, 10.2, "#e9e9e0", { pos: [0, 2.05, 0] });
  b.box(2.4, 0.08, 10.0, "#d8d8d0", { pos: [0, 2.38, 0] });
  // roof AC hump
  b.box(1.6, 0.22, 3.2, "#c9c9c0", { pos: [0, 2.55, -1.5] });
  g.box(2.54, 0.7, 9.4, "#7d99aa", { pos: [0, 1.95, -0.2] });
  g.box(2.3, 0.85, 0.05, "#7d99aa", { pos: [0, 1.85, 5.11] });
  // window pillars
  for (let i = -4; i <= 4; i += 1) {
    b.box(0.06, 0.7, 0.06, "#c9c9c0", { pos: [1.26, 1.95, i * 1.05] });
    b.box(0.06, 0.7, 0.06, "#c9c9c0", { pos: [-1.26, 1.95, i * 1.05] });
  }
  b.box(2.3, 0.18, 0.05, "#111", { pos: [0, 2.45, 5.12] });
  b.box(0.45, 0.22, 0.05, "#fff3bd", { pos: [0.85, 0.78, 5.12] });
  b.box(0.45, 0.22, 0.05, "#fff3bd", { pos: [-0.85, 0.78, 5.12] });
  b.box(2.4, 0.22, 0.12, DARK, { pos: [0, 0.34, 5.1] });
  // door outline
  b.box(0.9, 1.6, 0.04, "#4a5560", { pos: [1.28, 1.1, 3.2] });
  plate(b, -5.15, 0.7);
  for (const z of [3.4, -3.2, -4.3]) {
    for (const x of [-1.2, 1.2]) wheel(b, x, z, 0.5, 0.28);
  }
  if (opts.occupied) {
    seated(b, -0.55, 1.15, 4.2, 1);
    // passenger heads visible through side glass band
    for (let i = 0; i < 6; i += 1) {
      const skin = SKINS[i % SKINS.length];
      const z = 2.5 - i * 1.15;
      b.sphere(0.11, skin, { pos: [0.95, 1.85, z] }, 6);
      b.sphere(0.11, skin, { pos: [-0.95, 1.85, z - 0.4] }, 6);
    }
  }
  return { body: b.build(), glass: g.build() };
}

export function buildTruck(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  // cab
  b.box(2.3, 1.5, 1.7, WHITE, { pos: [0, 1.25, 2.3] });
  b.box(2.32, 0.12, 1.72, "#f2c230", { pos: [0, 1.55, 2.3] });
  b.box(2.2, 0.62, 0.05, DARK, { pos: [0, 1.55, 3.16] });
  b.box(2.0, 0.55, 0.04, GLASS, { pos: [0, 1.7, 3.14] });
  // chassis + painted cargo (classic Indian truck art stripes)
  b.box(2.5, 0.2, 6.2, DARK, { pos: [0, 0.62, -0.7] });
  b.box(2.5, 1.6, 5.5, "#d89a2b", { pos: [0, 1.62, -0.9] });
  b.box(2.56, 0.16, 5.56, "#a5361f", { pos: [0, 2.46, -0.9] });
  b.box(2.56, 0.16, 5.56, "#2a6aa3", { pos: [0, 1.1, -0.9] });
  b.box(2.56, 0.1, 5.56, "#f2c230", { pos: [0, 1.85, -0.9] });
  // rear art panel
  b.box(1.9, 0.42, 0.05, "#f2d04a", { pos: [0, 2.0, -3.68] });
  b.box(1.8, 0.12, 0.05, "#7a1b1b", { pos: [0, 2.0, -3.7] });
  b.box(0.5, 0.5, 0.04, "#c1121f", { pos: [0, 1.55, -3.7] });
  b.box(0.4, 0.15, 0.05, "#fff3bd", { pos: [0.75, 0.72, 3.17] });
  b.box(0.4, 0.15, 0.05, "#fff3bd", { pos: [-0.75, 0.72, 3.17] });
  // side mirror arms
  b.box(0.5, 0.04, 0.04, CHROME, { pos: [1.3, 1.85, 2.9] });
  b.box(0.5, 0.04, 0.04, CHROME, { pos: [-1.3, 1.85, 2.9] });
  plate(b, 3.2, 0.55);
  for (const z of [2.3, -1.4, -2.9]) {
    for (const x of [-1.1, 1.1]) wheel(b, x, z, 0.5, 0.3);
  }
  if (opts.occupied) seated(b, -0.45, 1.35, 2.45, 6);
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
