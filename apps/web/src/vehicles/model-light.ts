/** Auto-rickshaw + scooter meshes. */
import { GeoBuilder } from "../gfx/geo";
import { CHROME, LENS_AMBER, LENS_RED, LENS_WARM, gloss, matte } from "../gfx/surface";
import { DARK, GLASS, WHITE, plate, seated, wheel, type BuildOpts, type Model } from "./model-parts";

/** Auto-rickshaw. `livery` is [lower body, canopy]. */
export function buildAuto(livery: [string, string], opts: BuildOpts = {}): Model {
  const [low, up] = livery;
  const bodyPaint = gloss(low, 0.38);
  const canopy = gloss(up, 0.45);
  const b = new GeoBuilder();
  const g = new GeoBuilder();
  b.roundBox(1.12, 0.1, 2.15, DARK, { pos: [0, 0.32, -0.1] }, 0.04, 3);
  b.roundBox(0.68, 0.52, 0.62, bodyPaint, { pos: [0, 0.64, 0.98] }, 0.1, 4);
  b.sphere(0.28, bodyPaint, { pos: [0, 0.48, 1.2], scale: [0.95, 0.55, 0.7] }, 12);
  b.sphere(0.09, LENS_WARM, { pos: [0, 0.82, 1.32], scale: [1.2, 1, 0.55] }, 10);
  b.roundBox(1.28, 0.44, 1.0, bodyPaint, { pos: [0, 0.64, -0.55] }, 0.08, 3);
  b.roundBox(1.3, 0.08, 1.0, gloss("#f2c230", 0.4), { pos: [0, 0.86, -0.55] }, 0.03, 2);
  b.roundBox(1.12, 0.12, 0.82, matte("#2a2f36"), { pos: [0, 0.9, -0.55] }, 0.04, 2);
  b.roundBox(1.12, 0.36, 0.1, matte("#2a2f36"), { pos: [0, 1.08, -0.98] }, 0.04, 2);
  b.roundBox(0.52, 0.1, 0.4, matte("#2a2f36"), { pos: [0, 0.62, 0.28] }, 0.04, 2);
  b.roundBox(0.52, 0.28, 0.08, matte("#2a2f36"), { pos: [0, 0.8, 0.07] }, 0.03, 2);
  b.cyl(0.02, 0.02, 0.52, CHROME, { pos: [0, 1.05, 0.62], rot: [0, 0, Math.PI / 2] }, 8);
  b.cyl(0.02, 0.02, 0.5, CHROME, { pos: [0, 0.82, 0.62] }, 8);
  b.roundBox(1.36, 0.07, 2.12, canopy, { pos: [0, 1.76, -0.12] }, 0.04, 3);
  b.roundBox(1.22, 0.06, 0.42, canopy, { pos: [0, 1.72, 0.98], rot: [0.28, 0, 0] }, 0.03, 2);
  for (const x of [-0.62, 0.62]) {
    b.cyl(0.028, 0.028, 1.08, bodyPaint, { pos: [x, 1.22, -1.04] }, 8);
    b.cyl(0.028, 0.028, 1.08, bodyPaint, { pos: [x * 0.78, 1.22, 0.62], rot: [0.12, 0, 0] }, 8);
  }
  b.roundBox(1.22, 0.52, 0.05, DARK, { pos: [0, 1.34, -1.08] }, 0.02, 2);
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
    if (opts.pillion) seated(b, 0, 0.84, -0.55, 8, { bike: true, lean: 0.02 });
  }
  return { body: b.build(), glass: null };
}

/** Standalone pillion figure for instanced bike passengers. */
export function buildBikePillion(): Model {
  const b = new GeoBuilder();
  seated(b, 0, 0.84, -0.55, 8, { bike: true, lean: 0.02 });
  return { body: b.build(), glass: null };
}
