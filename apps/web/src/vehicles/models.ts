/**
 * Soft toy / Memoji-language vehicles — rounded silicone bodies, chrome accents,
 * rubber tires. Indian silhouettes (auto nose, truck art, RHD seating).
 */
import * as THREE from "three";
import { GeoBuilder } from "../gfx/geo";
import { CHROME, LENS_AMBER, LENS_RED, LENS_WARM, RUBBER, gloss, matte } from "../gfx/surface";

export type Model = {
  body: THREE.BufferGeometry;
  glass: THREE.BufferGeometry | null;
};

export type BuildOpts = {
  /** Bake a seated driver (and sometimes a pillion) into the mesh — for traffic only. */
  occupied?: boolean;
};

const DARK = matte("#17191d", 0.78);
const WHITE = gloss("#ffffff", 0.42);
const GLASS = { color: "#8fb4c9", rough: 0.12, metal: 0.15 };

const SKINS = ["#f0c9a0", "#e2ac7b", "#c98d5c", "#b07445", "#955c36", "#7a4727"] as const;
const TOPS = ["#1d4e89", "#b3261e", "#f2c230", "#1f7a3a", "#6a1b4d", "#151515", "#d9e3df", "#e07a3d"] as const;
const BOTTOMS = ["#243044", "#151515", "#4a4036", "#1f3a5f", "#d8cfb8"] as const;
const HAIRS = ["#16100c", "#2a1a10", "#4a2f1c"] as const;

function wheel(b: GeoBuilder, x: number, z: number, r: number, w: number): void {
  b.cyl(r, r, w, RUBBER, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 16);
  b.cyl(r * 0.55, r * 0.55, w + 0.02, CHROME, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 10);
  b.cyl(r * 0.18, r * 0.18, w + 0.04, DARK, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 8);
}

/** Soft Memoji-style seated figure for traffic (+X left, +Z forward). */
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
  // Soft hips / torso (no hard boxes)
  b.sphere(0.16 * s, bottom, { pos: [x, y, z + lean], scale: [1.05, 0.85, 0.9] }, 12);
  b.sphere(0.17 * s, top, { pos: [x, y + 0.28 * s, z - 0.02 + lean], scale: [1.05, 1.15, 0.75] }, 12);
  // Head + clay hair cap
  b.sphere(0.11 * s, skin, { pos: [x, y + 0.55 * s, z + 0.02 + lean] }, 14);
  b.sphere(0.115 * s, hair, {
    pos: [x, y + 0.59 * s, z - 0.01 + lean],
    scale: [1.02, 0.78, 1.05],
  }, 12);
  // Soft arms
  if (opts.bike) {
    b.capsule(0.032 * s, 0.2 * s, skin, { pos: [x + 0.15 * s, y + 0.36 * s, z + 0.2], rot: [0.9, 0, 0.35] }, 4, 8);
    b.capsule(0.032 * s, 0.2 * s, skin, { pos: [x - 0.15 * s, y + 0.36 * s, z + 0.2], rot: [0.9, 0, -0.35] }, 4, 8);
  } else {
    b.capsule(0.035 * s, 0.18 * s, skin, { pos: [x + 0.18 * s, y + 0.26 * s, z + 0.1], rot: [0.55, 0, 0.2] }, 4, 8);
    b.capsule(0.035 * s, 0.18 * s, skin, { pos: [x - 0.18 * s, y + 0.26 * s, z + 0.1], rot: [0.55, 0, -0.2] }, 4, 8);
  }
  // Folded thighs
  b.capsule(0.055 * s, 0.2 * s, bottom, { pos: [x + 0.09 * s, y - 0.02, z + 0.16], rot: [1.2, 0, 0.1] }, 4, 8);
  b.capsule(0.055 * s, 0.2 * s, bottom, { pos: [x - 0.09 * s, y - 0.02, z + 0.16], rot: [1.2, 0, -0.1] }, 4, 8);
}

function plate(b: GeoBuilder, z: number, y: number): void {
  b.roundBox(0.42, 0.12, 0.03, gloss("#f4f0e6", 0.55), { pos: [0, y, z] }, 0.02, 2);
  b.roundBox(0.38, 0.08, 0.02, gloss("#1d4e89", 0.45), { pos: [0, y, z + 0.01] }, 0.015, 2);
}

/** Auto-rickshaw. `livery` is [lower body, canopy]. */
export function buildAuto(livery: [string, string], opts: BuildOpts = {}): Model {
  const [low, up] = livery;
  const bodyPaint = gloss(low, 0.38);
  const canopy = gloss(up, 0.45);
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.12, 0.1, 2.15, DARK, { pos: [0, 0.32, -0.1] }, 0.04, 3);
  // Soft front cowl / Indian auto nose
  b.roundBox(0.68, 0.52, 0.62, bodyPaint, { pos: [0, 0.64, 0.98] }, 0.1, 4);
  b.sphere(0.28, bodyPaint, { pos: [0, 0.48, 1.2], scale: [0.95, 0.55, 0.7] }, 12);
  b.sphere(0.09, LENS_WARM, { pos: [0, 0.82, 1.32], scale: [1.2, 1, 0.55] }, 10);
  b.roundBox(1.28, 0.44, 1.0, bodyPaint, { pos: [0, 0.64, -0.55] }, 0.08, 3);
  b.roundBox(1.3, 0.08, 1.0, gloss("#f2c230", 0.4), { pos: [0, 0.86, -0.55] }, 0.03, 2);
  b.roundBox(1.12, 0.12, 0.82, matte("#2a2f36"), { pos: [0, 0.9, -0.55] }, 0.04, 2);
  b.roundBox(1.12, 0.36, 0.1, matte("#2a2f36"), { pos: [0, 1.08, -0.98] }, 0.04, 2);
  // Driver seat + softbar
  b.roundBox(0.52, 0.1, 0.4, matte("#2a2f36"), { pos: [0, 0.62, 0.28] }, 0.04, 2);
  b.roundBox(0.52, 0.28, 0.08, matte("#2a2f36"), { pos: [0, 0.8, 0.07] }, 0.03, 2);
  b.cyl(0.02, 0.02, 0.52, CHROME, { pos: [0, 1.05, 0.62], rot: [0, 0, Math.PI / 2] }, 8);
  b.cyl(0.02, 0.02, 0.5, CHROME, { pos: [0, 0.82, 0.62] }, 8);
  // Soft canopy
  b.roundBox(1.36, 0.07, 2.12, canopy, { pos: [0, 1.76, -0.12] }, 0.04, 3);
  b.roundBox(1.22, 0.06, 0.42, canopy, { pos: [0, 1.72, 0.98], rot: [0.28, 0, 0] }, 0.03, 2);
  for (const x of [-0.62, 0.62]) {
    b.cyl(0.028, 0.028, 1.08, bodyPaint, { pos: [x, 1.22, -1.04] }, 8);
    b.cyl(0.028, 0.028, 1.08, bodyPaint, { pos: [x * 0.78, 1.22, 0.62], rot: [0.12, 0, 0] }, 8);
  }
  b.roundBox(1.22, 0.52, 0.05, DARK, { pos: [0, 1.34, -1.08] }, 0.02, 2);
  // Side mirrors
  b.sphere(0.05, CHROME, { pos: [0.42, 1.15, 0.9], scale: [1.2, 0.9, 1.4] }, 8);
  b.sphere(0.05, CHROME, { pos: [-0.42, 1.15, 0.9], scale: [1.2, 0.9, 1.4] }, 8);
  g.roundBox(0.95, 0.52, 0.03, GLASS, { pos: [0, 1.4, 0.72], rot: [0.12, 0, 0] }, 0.02, 2);
  wheel(b, 0, 1.0, 0.26, 0.12);
  wheel(b, 0.6, -0.78, 0.27, 0.13);
  wheel(b, -0.6, -0.78, 0.27, 0.13);
  plate(b, -1.12, 0.55);
  if (opts.occupied) {
    seated(b, 0, 0.78, 0.28, 2);
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
  b.roundBox(0.22, 0.08, 0.7, matte("#25282e"), { pos: [0, 0.38, 0.05] }, 0.03, 2);
  b.roundBox(0.2, 0.34, 0.9, WHITE, { pos: [0, 0.5, 0.05] }, 0.06, 3);
  b.roundBox(0.26, 0.26, 0.52, WHITE, { pos: [0, 0.64, -0.5], rot: [-0.18, 0, 0] }, 0.06, 3);
  b.roundBox(0.28, 0.1, 0.62, matte("#25282e"), { pos: [0, 0.8, -0.3] }, 0.04, 2);
  b.roundBox(0.28, 0.1, 0.42, matte("#25282e"), { pos: [0, 0.82, -0.74] }, 0.04, 2);
  // Soft front apron
  b.roundBox(0.32, 0.48, 0.1, WHITE, { pos: [0, 0.54, 0.55], rot: [-0.25, 0, 0] }, 0.05, 3);
  b.roundBox(0.18, 0.05, 0.32, WHITE, { pos: [0, 0.36, 0.78] }, 0.02, 2);
  b.cyl(0.018, 0.018, 0.62, CHROME, { pos: [0, 0.74, 0.58], rot: [-0.25, 0, 0] }, 8);
  b.cyl(0.018, 0.018, 0.64, matte("#1b1b1b"), { pos: [0, 1.02, 0.5], rot: [0, 0, Math.PI / 2] }, 8);
  b.sphere(0.07, LENS_WARM, { pos: [0, 1.0, 0.64] }, 10);
  b.cyl(0.04, 0.05, 0.55, CHROME, { pos: [0.16, 0.34, -0.55], rot: [Math.PI / 2, 0, 0] }, 10);
  b.sphere(0.04, CHROME, { pos: [0.22, 1.05, 0.48] }, 8);
  b.sphere(0.04, CHROME, { pos: [-0.22, 1.05, 0.48] }, 8);
  b.sphere(0.05, LENS_RED, { pos: [0, 0.72, -0.98] }, 8);
  b.sphere(0.035, LENS_AMBER, { pos: [0.14, 0.7, 0.58] }, 6);
  b.sphere(0.035, LENS_AMBER, { pos: [-0.14, 0.7, 0.58] }, 6);
  if (opts.occupied) {
    seated(b, 0, 0.82, -0.02, 3, { bike: true });
    seated(b, 0, 0.84, -0.55, 8, { bike: true, lean: 0.02 });
  }
  return { body: b.build(), glass: null };
}

/** Hatchback taxi. Soft cabin silhouette. */
export function buildCar(livery: [string, string] | null, opts: BuildOpts = {}): Model {
  const low = livery ? gloss(livery[0], 0.36) : WHITE;
  const up = livery ? gloss(livery[1], 0.4) : WHITE;
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.72, 0.52, 4.0, low, { pos: [0, 0.64, 0] }, 0.12, 4);
  b.roundBox(1.66, 0.12, 4.0, DARK, { pos: [0, 0.34, 0] }, 0.04, 2);
  b.roundBox(1.74, 0.06, 3.9, matte("#2a2f36"), { pos: [0, 0.92, 0] }, 0.03, 2);
  b.roundBox(1.6, 0.08, 1.15, low, { pos: [0, 0.96, 1.38], rot: [0.05, 0, 0] }, 0.05, 3);
  // Soft roof cabin
  b.roundBox(1.5, 0.08, 1.55, up, { pos: [0, 1.38, -0.2] }, 0.04, 3);
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.88, 0.44]) {
      b.cyl(0.04, 0.04, 0.42, up, { pos: [x, 1.14, z] }, 8);
    }
  }
  g.roundBox(1.54, 0.36, 1.66, GLASS, { pos: [0, 1.14, -0.18] }, 0.05, 3);
  // Bumpers + lights
  b.roundBox(1.76, 0.18, 0.18, DARK, { pos: [0, 0.42, 2.0] }, 0.05, 3);
  b.roundBox(1.76, 0.18, 0.18, DARK, { pos: [0, 0.42, -2.0] }, 0.05, 3);
  b.sphere(0.08, LENS_WARM, { pos: [0.6, 0.78, 2.01], scale: [1.6, 0.9, 0.5] }, 8);
  b.sphere(0.08, LENS_WARM, { pos: [-0.6, 0.78, 2.01], scale: [1.6, 0.9, 0.5] }, 8);
  b.sphere(0.08, LENS_RED, { pos: [0.6, 0.8, -2.01], scale: [1.6, 0.9, 0.5] }, 8);
  b.sphere(0.08, LENS_RED, { pos: [-0.6, 0.8, -2.01], scale: [1.6, 0.9, 0.5] }, 8);
  b.sphere(0.03, CHROME, { pos: [0.88, 0.78, 0.35] }, 6);
  b.sphere(0.03, CHROME, { pos: [-0.88, 0.78, 0.35] }, 6);
  b.sphere(0.03, CHROME, { pos: [0.88, 0.78, -0.55] }, 6);
  b.sphere(0.03, CHROME, { pos: [-0.88, 0.78, -0.55] }, 6);
  if (livery) {
    b.roundBox(0.55, 0.12, 0.2, LENS_WARM, { pos: [0, 1.48, -0.2] }, 0.04, 2);
    b.sphere(0.05, LENS_RED, { pos: [0, 1.56, -0.2] }, 8);
  }
  plate(b, 2.05, 0.5);
  plate(b, -2.05, 0.5);
  for (const x of [-0.84, 0.84]) {
    wheel(b, x, 1.25, 0.31, 0.2);
    wheel(b, x, -1.25, 0.31, 0.2);
  }
  if (opts.occupied) {
    seated(b, -0.38, 0.72, 0.28, 4);
    seated(b, 0.38, 0.72, -0.55, 9);
  }
  return { body: b.build(), glass: g.build() };
}

export function buildBus(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(2.5, 1.5, 10.2, WHITE, { pos: [0, 1.05, 0] }, 0.14, 4);
  b.roundBox(2.52, 0.22, 10.22, gloss("#1d4e89", 0.4), { pos: [0, 0.55, 0] }, 0.06, 3);
  b.roundBox(2.52, 0.14, 10.22, gloss("#f2c230", 0.4), { pos: [0, 1.55, 0] }, 0.04, 2);
  b.roundBox(2.5, 0.55, 10.2, gloss("#e9e9e0", 0.5), { pos: [0, 2.05, 0] }, 0.08, 3);
  b.roundBox(2.4, 0.08, 10.0, matte("#d8d8d0"), { pos: [0, 2.38, 0] }, 0.03, 2);
  b.roundBox(1.6, 0.22, 3.2, matte("#c9c9c0"), { pos: [0, 2.55, -1.5] }, 0.06, 2);
  g.roundBox(2.54, 0.7, 9.4, { color: "#7d99aa", rough: 0.14, metal: 0.12 }, { pos: [0, 1.95, -0.2] }, 0.06, 3);
  g.roundBox(2.3, 0.85, 0.05, { color: "#7d99aa", rough: 0.14, metal: 0.12 }, { pos: [0, 1.85, 5.11] }, 0.03, 2);
  for (let i = -4; i <= 4; i += 1) {
    b.cyl(0.04, 0.04, 0.7, matte("#c9c9c0"), { pos: [1.26, 1.95, i * 1.05] }, 6);
    b.cyl(0.04, 0.04, 0.7, matte("#c9c9c0"), { pos: [-1.26, 1.95, i * 1.05] }, 6);
  }
  b.roundBox(2.3, 0.18, 0.05, DARK, { pos: [0, 2.45, 5.12] }, 0.02, 2);
  b.sphere(0.14, LENS_WARM, { pos: [0.85, 0.78, 5.12], scale: [1.4, 1, 0.4] }, 8);
  b.sphere(0.14, LENS_WARM, { pos: [-0.85, 0.78, 5.12], scale: [1.4, 1, 0.4] }, 8);
  b.roundBox(2.4, 0.22, 0.12, DARK, { pos: [0, 0.34, 5.1] }, 0.05, 2);
  b.roundBox(0.9, 1.6, 0.04, matte("#4a5560"), { pos: [1.28, 1.1, 3.2] }, 0.03, 2);
  plate(b, -5.15, 0.7);
  for (const z of [3.4, -3.2, -4.3]) {
    for (const x of [-1.2, 1.2]) wheel(b, x, z, 0.5, 0.28);
  }
  if (opts.occupied) {
    seated(b, -0.55, 1.15, 4.2, 1);
    for (let i = 0; i < 6; i += 1) {
      const skin = SKINS[i % SKINS.length];
      const z = 2.5 - i * 1.15;
      b.sphere(0.11, skin, { pos: [0.95, 1.85, z] }, 8);
      b.sphere(0.11, skin, { pos: [-0.95, 1.85, z - 0.4] }, 8);
    }
  }
  return { body: b.build(), glass: g.build() };
}

export function buildTruck(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  b.roundBox(2.3, 1.5, 1.7, WHITE, { pos: [0, 1.25, 2.3] }, 0.12, 4);
  b.roundBox(2.32, 0.12, 1.72, gloss("#f2c230", 0.4), { pos: [0, 1.55, 2.3] }, 0.04, 2);
  b.roundBox(2.2, 0.62, 0.05, DARK, { pos: [0, 1.55, 3.16] }, 0.03, 2);
  b.roundBox(2.0, 0.55, 0.04, GLASS, { pos: [0, 1.7, 3.14] }, 0.03, 2);
  b.roundBox(2.5, 0.2, 6.2, DARK, { pos: [0, 0.62, -0.7] }, 0.06, 3);
  // Soft cargo box with Indian truck art stripes
  b.roundBox(2.5, 1.6, 5.5, gloss("#d89a2b", 0.45), { pos: [0, 1.62, -0.9] }, 0.1, 3);
  b.roundBox(2.56, 0.16, 5.56, gloss("#a5361f", 0.4), { pos: [0, 2.46, -0.9] }, 0.04, 2);
  b.roundBox(2.56, 0.16, 5.56, gloss("#2a6aa3", 0.4), { pos: [0, 1.1, -0.9] }, 0.04, 2);
  b.roundBox(2.56, 0.1, 5.56, gloss("#f2c230", 0.4), { pos: [0, 1.85, -0.9] }, 0.03, 2);
  b.roundBox(1.9, 0.42, 0.05, gloss("#f2d04a", 0.45), { pos: [0, 2.0, -3.68] }, 0.04, 2);
  b.roundBox(1.8, 0.12, 0.05, gloss("#7a1b1b", 0.4), { pos: [0, 2.0, -3.7] }, 0.02, 2);
  b.sphere(0.28, LENS_RED, { pos: [0, 1.55, -3.7] }, 10);
  b.sphere(0.12, LENS_WARM, { pos: [0.75, 0.72, 3.17], scale: [1.5, 0.9, 0.5] }, 8);
  b.sphere(0.12, LENS_WARM, { pos: [-0.75, 0.72, 3.17], scale: [1.5, 0.9, 0.5] }, 8);
  b.cyl(0.025, 0.025, 0.5, CHROME, { pos: [1.3, 1.85, 2.9], rot: [0, 0, Math.PI / 2] }, 6);
  b.cyl(0.025, 0.025, 0.5, CHROME, { pos: [-1.3, 1.85, 2.9], rot: [0, 0, Math.PI / 2] }, 6);
  b.sphere(0.05, CHROME, { pos: [1.55, 1.85, 2.9] }, 6);
  b.sphere(0.05, CHROME, { pos: [-1.55, 1.85, 2.9] }, 6);
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
  roughness: 0.1,
  metalness: 0.18,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});
