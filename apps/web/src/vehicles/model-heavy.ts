/** Hatchback taxi, bus, and truck meshes. */
import { GeoBuilder } from "../gfx/geo";
import { CHROME, LENS_RED, LENS_WARM, gloss, matte } from "../gfx/surface";
import { DARK, GLASS, SKINS, WHITE, plate, seated, wheel, type BuildOpts, type Model } from "./model-parts";

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
  b.roundBox(1.5, 0.08, 1.55, up, { pos: [0, 1.38, -0.2] }, 0.04, 3);
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.88, 0.44]) {
      b.cyl(0.04, 0.04, 0.42, up, { pos: [x, 1.14, z] }, 8);
    }
  }
  g.roundBox(1.54, 0.36, 1.66, GLASS, { pos: [0, 1.14, -0.18] }, 0.05, 3);
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
