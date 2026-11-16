/** Shared vehicle mesh helpers (wheels, seated traffic drivers, plates). */
import * as THREE from "three";
import { GeoBuilder } from "../gfx/geo";
import { CHROME, RUBBER, gloss, matte } from "../gfx/surface";

export type Model = {
  body: THREE.BufferGeometry;
  glass: THREE.BufferGeometry | null;
};

export type BuildOpts = {
  /** Bake a seated driver into the mesh — for traffic only. */
  occupied?: boolean;
  /** Bake a rear pillion on scooters/bikes (requires occupied). */
  pillion?: boolean;
};

export const DARK = matte("#17191d", 0.78);
export const WHITE = gloss("#ffffff", 0.42);
export const GLASS = { color: "#8fb4c9", rough: 0.12, metal: 0.15 };

const SKINS = ["#f0c9a0", "#e2ac7b", "#c98d5c", "#b07445", "#955c36", "#7a4727"] as const;
const TOPS = ["#1d4e89", "#b3261e", "#f2c230", "#1f7a3a", "#6a1b4d", "#151515", "#d9e3df", "#e07a3d"] as const;
const BOTTOMS = ["#243044", "#151515", "#4a4036", "#1f3a5f", "#d8cfb8"] as const;
const HAIRS = ["#16100c", "#2a1a10", "#4a2f1c"] as const;

export { SKINS };

export function wheel(b: GeoBuilder, x: number, z: number, r: number, w: number): void {
  b.cyl(r, r, w, RUBBER, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 16);
  b.cyl(r * 0.55, r * 0.55, w + 0.02, CHROME, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 10);
  b.cyl(r * 0.18, r * 0.18, w + 0.04, DARK, { pos: [x, r, z], rot: [0, 0, Math.PI / 2] }, 8);
}

/** Soft Memoji-style seated figure for traffic (+X left, +Z forward). */
export function seated(
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
  b.sphere(0.16 * s, bottom, { pos: [x, y, z + lean], scale: [1.05, 0.85, 0.9] }, 12);
  b.sphere(0.17 * s, top, { pos: [x, y + 0.28 * s, z - 0.02 + lean], scale: [1.05, 1.15, 0.75] }, 12);
  b.sphere(0.11 * s, skin, { pos: [x, y + 0.55 * s, z + 0.02 + lean] }, 14);
  b.sphere(0.115 * s, hair, {
    pos: [x, y + 0.59 * s, z - 0.01 + lean],
    scale: [1.02, 0.78, 1.05],
  }, 12);
  if (opts.bike) {
    b.capsule(0.032 * s, 0.2 * s, skin, { pos: [x + 0.15 * s, y + 0.36 * s, z + 0.2], rot: [0.9, 0, 0.35] }, 4, 8);
    b.capsule(0.032 * s, 0.2 * s, skin, { pos: [x - 0.15 * s, y + 0.36 * s, z + 0.2], rot: [0.9, 0, -0.35] }, 4, 8);
  } else {
    b.capsule(0.035 * s, 0.18 * s, skin, { pos: [x + 0.18 * s, y + 0.26 * s, z + 0.1], rot: [0.55, 0, 0.2] }, 4, 8);
    b.capsule(0.035 * s, 0.18 * s, skin, { pos: [x - 0.18 * s, y + 0.26 * s, z + 0.1], rot: [0.55, 0, -0.2] }, 4, 8);
  }
  b.capsule(0.055 * s, 0.2 * s, bottom, { pos: [x + 0.09 * s, y - 0.02, z + 0.16], rot: [1.2, 0, 0.1] }, 4, 8);
  b.capsule(0.055 * s, 0.2 * s, bottom, { pos: [x - 0.09 * s, y - 0.02, z + 0.16], rot: [1.2, 0, -0.1] }, 4, 8);
}

export function plate(b: GeoBuilder, z: number, y: number): void {
  b.roundBox(0.42, 0.12, 0.03, gloss("#f4f0e6", 0.55), { pos: [0, y, z] }, 0.02, 2);
  b.roundBox(0.38, 0.08, 0.02, gloss("#1d4e89", 0.45), { pos: [0, y, z + 0.01] }, 0.015, 2);
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
