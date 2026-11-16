/** Extra Indian street vehicles — motorcycle, SUV, tempo, van, jeep, taxi, e-rickshaw. */
import { GeoBuilder } from "../gfx/geo";
import { CHROME, LENS_AMBER, LENS_RED, LENS_WARM, gloss, matte } from "../gfx/surface";
import { DARK, GLASS, WHITE, plate, seated, wheel, type BuildOpts, type Model } from "./model-parts";

/** Commuter motorcycle — longer tank, exposed engine vs scooter. */
export function buildMotorcycle(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const wr = 0.32;
  wheel(b, 0, 0.72, wr, 0.11);
  wheel(b, 0, -0.72, wr, 0.12);
  b.roundBox(0.18, 0.1, 0.85, matte("#1a1c20"), { pos: [0, 0.4, 0] }, 0.03, 2);
  b.roundBox(0.34, 0.28, 0.7, WHITE, { pos: [0, 0.58, 0.05] }, 0.07, 3);
  b.roundBox(0.3, 0.22, 0.48, WHITE, { pos: [0, 0.62, -0.55], rot: [-0.12, 0, 0] }, 0.06, 3);
  b.roundBox(0.36, 0.12, 0.55, matte("#25282e"), { pos: [0, 0.78, -0.35] }, 0.04, 2);
  b.roundBox(0.28, 0.42, 0.12, WHITE, { pos: [0, 0.58, 0.62], rot: [-0.2, 0, 0] }, 0.05, 3);
  b.cyl(0.05, 0.05, 0.35, matte("#3a3e44"), { pos: [0.14, 0.42, 0.1], rot: [Math.PI / 2, 0, 0] }, 10);
  b.cyl(0.018, 0.018, 0.7, CHROME, { pos: [0, 0.78, 0.55], rot: [-0.28, 0, 0] }, 8);
  b.cyl(0.018, 0.018, 0.72, matte("#1b1b1b"), { pos: [0, 1.08, 0.42], rot: [0, 0, Math.PI / 2] }, 8);
  b.sphere(0.08, LENS_WARM, { pos: [0, 1.05, 0.58] }, 10);
  b.sphere(0.05, LENS_RED, { pos: [0, 0.7, -1.05] }, 8);
  b.cyl(0.045, 0.05, 0.5, CHROME, { pos: [0.18, 0.36, -0.62], rot: [Math.PI / 2, 0, 0] }, 10);
  if (opts.occupied) {
    seated(b, 0, 0.84, 0.0, 3, { bike: true });
    if (opts.pillion) seated(b, 0, 0.86, -0.52, 8, { bike: true, lean: 0.02 });
  }
  return { body: b.build(), glass: null };
}

/** Tall family SUV / Innova silhouette. */
export function buildSuv(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.88, 0.7, 4.55, WHITE, { pos: [0, 0.78, 0] }, 0.12, 4);
  b.roundBox(1.82, 0.14, 4.5, DARK, { pos: [0, 0.38, 0] }, 0.04, 2);
  b.roundBox(1.78, 0.7, 2.4, WHITE, { pos: [0, 1.35, -0.15] }, 0.1, 4);
  g.roundBox(1.72, 0.55, 2.2, GLASS, { pos: [0, 1.38, -0.1] }, 0.06, 3);
  g.roundBox(1.6, 0.5, 0.06, GLASS, { pos: [0, 1.3, 1.55], rot: [0.08, 0, 0] }, 0.03, 2);
  b.sphere(0.09, LENS_WARM, { pos: [0.68, 0.85, 2.25], scale: [1.5, 0.9, 0.45] }, 8);
  b.sphere(0.09, LENS_WARM, { pos: [-0.68, 0.85, 2.25], scale: [1.5, 0.9, 0.45] }, 8);
  b.sphere(0.09, LENS_RED, { pos: [0.68, 0.88, -2.25], scale: [1.5, 0.9, 0.45] }, 8);
  b.sphere(0.09, LENS_RED, { pos: [-0.68, 0.88, -2.25], scale: [1.5, 0.9, 0.45] }, 8);
  plate(b, 2.3, 0.55);
  for (const x of [-0.88, 0.88]) {
    wheel(b, x, 1.35, 0.36, 0.22);
    wheel(b, x, -1.35, 0.36, 0.22);
  }
  if (opts.occupied) {
    seated(b, -0.4, 0.95, 0.35, 4);
    seated(b, 0.4, 0.95, -0.6, 9);
  }
  return { body: b.build(), glass: g.build() };
}

/** Goods tempo / mini truck. */
export function buildTempo(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.7, 0.95, 1.55, WHITE, { pos: [0, 1.0, 1.35] }, 0.1, 4);
  b.roundBox(1.72, 0.1, 1.55, gloss("#f2c230", 0.4), { pos: [0, 1.35, 1.35] }, 0.03, 2);
  g.roundBox(1.55, 0.45, 0.05, GLASS, { pos: [0, 1.25, 2.12] }, 0.03, 2);
  b.roundBox(1.85, 0.18, 3.2, DARK, { pos: [0, 0.55, -0.55] }, 0.05, 3);
  b.roundBox(1.8, 1.0, 2.7, gloss("#c45c26", 0.42), { pos: [0, 1.15, -0.7] }, 0.08, 3);
  b.roundBox(1.82, 0.12, 2.72, gloss("#2a6aa3", 0.4), { pos: [0, 1.7, -0.7] }, 0.03, 2);
  b.sphere(0.1, LENS_WARM, { pos: [0.55, 0.75, 2.15], scale: [1.4, 0.9, 0.45] }, 8);
  b.sphere(0.1, LENS_WARM, { pos: [-0.55, 0.75, 2.15], scale: [1.4, 0.9, 0.45] }, 8);
  b.sphere(0.1, LENS_RED, { pos: [0, 1.2, -2.15], scale: [1.8, 0.9, 0.4] }, 8);
  plate(b, 2.2, 0.5);
  for (const z of [1.2, -1.35]) {
    for (const x of [-0.82, 0.82]) wheel(b, x, z, 0.38, 0.22);
  }
  if (opts.occupied) seated(b, -0.35, 1.05, 1.4, 6);
  return { body: b.build(), glass: g.build() };
}

/** Box van / school / delivery van. */
export function buildVan(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.9, 1.55, 4.85, WHITE, { pos: [0, 1.15, 0] }, 0.12, 4);
  b.roundBox(1.92, 0.16, 4.85, DARK, { pos: [0, 0.4, 0] }, 0.04, 2);
  b.roundBox(1.88, 0.12, 4.8, gloss("#1d4e89", 0.4), { pos: [0, 1.85, 0] }, 0.03, 2);
  g.roundBox(1.78, 0.55, 0.06, GLASS, { pos: [0, 1.35, 2.4] }, 0.03, 2);
  g.roundBox(0.06, 0.7, 2.8, GLASS, { pos: [0.96, 1.3, -0.2] }, 0.02, 2);
  g.roundBox(0.06, 0.7, 2.8, GLASS, { pos: [-0.96, 1.3, -0.2] }, 0.02, 2);
  b.sphere(0.1, LENS_WARM, { pos: [0.65, 0.85, 2.42], scale: [1.5, 0.9, 0.45] }, 8);
  b.sphere(0.1, LENS_WARM, { pos: [-0.65, 0.85, 2.42], scale: [1.5, 0.9, 0.45] }, 8);
  b.sphere(0.1, LENS_RED, { pos: [0.65, 0.9, -2.42], scale: [1.5, 0.9, 0.45] }, 8);
  b.sphere(0.1, LENS_RED, { pos: [-0.65, 0.9, -2.42], scale: [1.5, 0.9, 0.45] }, 8);
  plate(b, 2.45, 0.55);
  for (const x of [-0.9, 0.9]) {
    wheel(b, x, 1.4, 0.35, 0.22);
    wheel(b, x, -1.45, 0.35, 0.22);
  }
  if (opts.occupied) seated(b, -0.4, 1.0, 1.5, 4);
  return { body: b.build(), glass: g.build() };
}

/** Open-top jeep / Bolero style. */
export function buildJeep(opts: BuildOpts = {}): Model {
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.78, 0.55, 3.9, WHITE, { pos: [0, 0.7, 0] }, 0.1, 4);
  b.roundBox(1.72, 0.12, 3.85, DARK, { pos: [0, 0.38, 0] }, 0.04, 2);
  b.roundBox(1.65, 0.55, 1.35, WHITE, { pos: [0, 1.15, 0.85] }, 0.08, 3);
  b.roundBox(1.7, 0.08, 1.9, matte("#2a2f36"), { pos: [0, 1.0, -0.85] }, 0.03, 2);
  b.cyl(0.03, 0.03, 1.5, CHROME, { pos: [0.78, 1.35, -0.2], rot: [0.15, 0, 0] }, 8);
  b.cyl(0.03, 0.03, 1.5, CHROME, { pos: [-0.78, 1.35, -0.2], rot: [0.15, 0, 0] }, 8);
  b.roundBox(1.6, 0.06, 1.7, matte("#3a4048"), { pos: [0, 1.72, -0.35] }, 0.02, 2);
  g.roundBox(1.55, 0.42, 0.05, GLASS, { pos: [0, 1.25, 1.55], rot: [0.1, 0, 0] }, 0.03, 2);
  b.sphere(0.08, LENS_WARM, { pos: [0.58, 0.78, 1.95], scale: [1.4, 0.9, 0.45] }, 8);
  b.sphere(0.08, LENS_WARM, { pos: [-0.58, 0.78, 1.95], scale: [1.4, 0.9, 0.45] }, 8);
  b.sphere(0.08, LENS_RED, { pos: [0.58, 0.78, -1.95], scale: [1.4, 0.9, 0.45] }, 8);
  b.sphere(0.08, LENS_RED, { pos: [-0.58, 0.78, -1.95], scale: [1.4, 0.9, 0.45] }, 8);
  plate(b, 2.0, 0.5);
  for (const x of [-0.85, 0.85]) {
    wheel(b, x, 1.2, 0.38, 0.24);
    wheel(b, x, -1.2, 0.38, 0.24);
  }
  if (opts.occupied) seated(b, -0.35, 0.9, 0.7, 4);
  return { body: b.build(), glass: g.build() };
}

/** Black-and-yellow city taxi (fixed livery; tint still shifts slightly). */
export function buildTaxi(opts: BuildOpts = {}): Model {
  const low = gloss("#1a1a1a", 0.38);
  const up = gloss("#f2c230", 0.42);
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.72, 0.52, 4.15, low, { pos: [0, 0.64, 0] }, 0.12, 4);
  b.roundBox(1.66, 0.12, 4.1, DARK, { pos: [0, 0.34, 0] }, 0.04, 2);
  b.roundBox(1.6, 0.08, 1.15, up, { pos: [0, 0.96, 1.4], rot: [0.05, 0, 0] }, 0.05, 3);
  b.roundBox(1.5, 0.08, 1.55, up, { pos: [0, 1.38, -0.2] }, 0.04, 3);
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.88, 0.44]) {
      b.cyl(0.04, 0.04, 0.42, up, { pos: [x, 1.14, z] }, 8);
    }
  }
  g.roundBox(1.54, 0.36, 1.66, GLASS, { pos: [0, 1.14, -0.18] }, 0.05, 3);
  b.roundBox(0.55, 0.14, 0.22, LENS_WARM, { pos: [0, 1.5, -0.15] }, 0.04, 2);
  b.sphere(0.09, LENS_WARM, { pos: [0.6, 0.78, 2.05], scale: [1.6, 0.9, 0.5] }, 8);
  b.sphere(0.09, LENS_WARM, { pos: [-0.6, 0.78, 2.05], scale: [1.6, 0.9, 0.5] }, 8);
  b.sphere(0.09, LENS_RED, { pos: [0.6, 0.8, -2.05], scale: [1.6, 0.9, 0.5] }, 8);
  b.sphere(0.09, LENS_RED, { pos: [-0.6, 0.8, -2.05], scale: [1.6, 0.9, 0.5] }, 8);
  plate(b, 2.1, 0.5);
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

/** Battery e-rickshaw — boxier nose than petrol auto. */
export function buildERickshaw(opts: BuildOpts = {}): Model {
  const bodyPaint = gloss("#2f7a5a", 0.4);
  const canopy = gloss("#e8f0ec", 0.45);
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.2, 0.12, 2.25, DARK, { pos: [0, 0.34, -0.05] }, 0.04, 3);
  b.roundBox(0.85, 0.55, 0.7, bodyPaint, { pos: [0, 0.68, 0.95] }, 0.1, 4);
  b.roundBox(0.5, 0.35, 0.35, matte("#1b1b1b"), { pos: [0, 0.55, 1.35] }, 0.06, 3);
  b.roundBox(1.28, 0.48, 1.05, bodyPaint, { pos: [0, 0.66, -0.5] }, 0.08, 3);
  b.roundBox(1.3, 0.1, 1.05, gloss("#f2c230", 0.4), { pos: [0, 0.9, -0.5] }, 0.03, 2);
  b.roundBox(1.18, 0.14, 0.85, matte("#2a2f36"), { pos: [0, 0.95, -0.5] }, 0.04, 2);
  b.roundBox(1.18, 0.4, 0.1, matte("#2a2f36"), { pos: [0, 1.12, -0.95] }, 0.04, 2);
  b.roundBox(1.4, 0.08, 2.2, canopy, { pos: [0, 1.78, -0.08] }, 0.04, 3);
  for (const x of [-0.64, 0.64]) {
    b.cyl(0.028, 0.028, 1.05, bodyPaint, { pos: [x, 1.25, -1.0] }, 8);
    b.cyl(0.028, 0.028, 1.0, bodyPaint, { pos: [x * 0.8, 1.25, 0.55], rot: [0.1, 0, 0] }, 8);
  }
  g.roundBox(0.95, 0.48, 0.03, GLASS, { pos: [0, 1.4, 0.7], rot: [0.1, 0, 0] }, 0.02, 2);
  b.sphere(0.08, LENS_WARM, { pos: [0, 0.85, 1.4], scale: [1.3, 1, 0.5] }, 10);
  b.sphere(0.04, LENS_AMBER, { pos: [0.4, 0.75, 1.25] }, 6);
  b.sphere(0.04, LENS_AMBER, { pos: [-0.4, 0.75, 1.25] }, 6);
  wheel(b, 0, 1.05, 0.26, 0.12);
  wheel(b, 0.58, -0.75, 0.27, 0.13);
  wheel(b, -0.58, -0.75, 0.27, 0.13);
  plate(b, -1.15, 0.55);
  if (opts.occupied) {
    seated(b, 0, 0.8, 0.3, 2);
    seated(b, 0.26, 0.74, -0.5, 5);
  }
  return { body: b.build(), glass: g.build() };
}
