/** Soft Memoji limbs — arms seat into shoulders, legs into hips. */
import type { GeoBuilder } from "../gfx/geo";
import { darker } from "./parts";
import type { Look } from "./appearance";

/**
 * @param sleeve optional short-sleeve fabric colour — rides with the arm so it never fights the torso
 */
export function buildUpperArm(
  ua: GeoBuilder,
  armR: number,
  color: string,
  sleeve?: string,
): void {
  if (sleeve) {
    // Short sleeve stub (moves with the arm) — overlaps skin so no hollow cuff
    ua.sphere(armR * 1.55, sleeve, { pos: [0, 0.02, 0], scale: [1.18, 0.85, 1.18] }, 14);
    ua.cyl(armR * 1.25, armR * 1.18, 0.1, sleeve, { pos: [0, -0.05, 0] }, 12);
    ua.torus(armR * 1.15, 0.007, darker(sleeve, 0.9), {
      pos: [0, -0.1, 0],
      rot: [Math.PI / 2, 0, 0],
    });
    // Skin continues up under the sleeve hem
    ua.capsule(armR * 1.08, 0.16, color, { pos: [0, -0.14, 0] }, 5, 14);
    ua.sphere(armR * 1.15, color, { pos: [0, -0.255, 0], scale: [1.08, 0.65, 1.08] }, 12);
  } else {
    ua.sphere(armR * 1.6, color, { pos: [0, 0.02, 0], scale: [1.2, 0.85, 1.2] }, 14);
    ua.capsule(armR * 1.15, 0.22, color, { pos: [0, -0.12, 0] }, 5, 14);
    ua.sphere(armR * 1.2, color, { pos: [0, -0.255, 0], scale: [1.1, 0.7, 1.1] }, 12);
  }
}

/**
 * @param side +1 = left (thumb +X), -1 = right (thumb −X)
 */
export function buildForeArm(
  fa: GeoBuilder,
  armR: number,
  color: string,
  skin: string,
  look: Look,
  side: 1 | -1 = 1,
): void {
  // Soft elbow nest + continuous forearm (no washer rings)
  fa.sphere(armR * 1.08, color, { pos: [0, 0.008, 0], scale: [1.08, 0.55, 1.08] }, 10);
  fa.capsule(armR * 1.0, 0.18, color, { pos: [0, -0.11, 0] }, 5, 14);
  if (look.acc & 64) {
    fa.torus(armR * 1.0, 0.007, { color: "#c9a227", rough: 0.35, metal: 0.85 }, {
      pos: [0, -0.175, 0],
      rot: [Math.PI / 2, 0, 0],
    });
    fa.roundBox(0.022, 0.014, 0.005, "#1a1a1a", { pos: [0, -0.175, armR * 0.95] }, 0.002, 2);
  }
  buildHand(fa, skin, side);
}

/** Soft Memoji hand — open palm + readable fingers. */
function buildHand(fa: GeoBuilder, skin: string, side: 1 | -1): void {
  const sx = side;
  fa.sphere(0.044, skin, { pos: [0, -0.238, 0.018], scale: [1.25, 0.72, 0.88] }, 14);
  fa.sphere(0.033, skin, { pos: [0, -0.27, 0.032], scale: [1.4, 0.4, 0.78] }, 10);
  const lens = [0.026, 0.03, 0.028, 0.022] as const;
  for (let f = 0; f < 4; f += 1) {
    const fx = (f - 1.5) * 0.014;
    fa.capsule(0.0075, lens[f], skin, { pos: [fx, -0.302, 0.04], rot: [0.12, 0, 0] }, 3, 8);
  }
  fa.capsule(0.0085, 0.02, skin, {
    pos: [sx * 0.034, -0.255, 0.02],
    rot: [0.2, sx * 0.15, sx * 0.85],
  }, 3, 8);
}

/** @param underTunic smaller hip ball so kurta/saree hems aren't poked through */
export function buildThigh(
  th: GeoBuilder,
  legR: number,
  color: string,
  underTunic = false,
): void {
  const hip = underTunic ? 1.05 : 1.28;
  th.sphere(legR * hip, color, { pos: [0, 0.01, 0], scale: [1.08, 0.6, 1.08] }, 12);
  th.capsule(legR * 1.15, 0.3, color, { pos: [0, -0.18, 0] }, 5, 14);
  th.sphere(legR * 1.12, color, { pos: [0, -0.385, 0], scale: [1.05, 0.6, 1.05] }, 10);
}

export function buildShin(
  sh: GeoBuilder,
  legR: number,
  color: string,
  shoeCol: string,
  shoeStyle: number,
  skin: string,
): void {
  sh.sphere(legR * 1.1, color, { pos: [0, 0.01, 0.01], scale: [1.05, 0.55, 1.08] }, 10);
  sh.capsule(legR * 1.0, 0.24, color, { pos: [0, -0.15, 0] }, 5, 14);
  sh.sphere(legR * 0.82, darker(color, 0.95), { pos: [0, -0.34, 0], scale: [1.02, 0.55, 1.02] }, 10);

  if (shoeStyle === 2) {
    sh.roundBox(0.082, 0.016, 0.2, shoeCol, { pos: [0, -0.4, 0.04] }, 0.008, 2);
    sh.roundBox(0.014, 0.012, 0.055, darker(shoeCol, 0.75), {
      pos: [0.022, -0.386, 0.055],
      rot: [0, 0, 0.35],
    }, 0.004, 2);
    sh.roundBox(0.014, 0.012, 0.055, darker(shoeCol, 0.75), {
      pos: [-0.022, -0.386, 0.055],
      rot: [0, 0, -0.35],
    }, 0.004, 2);
    sh.sphere(0.034, skin, { pos: [0, -0.385, -0.015], scale: [1.2, 0.7, 1.15] }, 10);
  } else if (shoeStyle === 1) {
    sh.roundBox(0.09, 0.052, 0.22, shoeCol, { pos: [0, -0.38, 0.04] }, 0.014, 3);
    sh.sphere(0.042, shoeCol, { pos: [0, -0.375, 0.14], scale: [1.05, 0.7, 1] }, 12);
    sh.roundBox(0.092, 0.012, 0.22, darker(shoeCol, 0.55), { pos: [0, -0.41, 0.04] }, 0.004, 2);
  } else {
    sh.roundBox(0.096, 0.055, 0.22, shoeCol, { pos: [0, -0.375, 0.04] }, 0.016, 3);
    sh.roundBox(0.1, 0.016, 0.23, "#f5f5f5", { pos: [0, -0.41, 0.04] }, 0.006, 2);
    sh.sphere(0.044, shoeCol, { pos: [0, -0.372, 0.14], scale: [1.08, 0.72, 1] }, 12);
    sh.roundBox(0.068, 0.022, 0.04, darker(shoeCol, 0.88), { pos: [0, -0.35, 0.02] }, 0.006, 2);
    sh.roundBox(0.05, 0.01, 0.08, "#ffffff", { pos: [0, -0.355, 0.06] }, 0.004, 2);
  }
}
