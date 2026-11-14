/** Arms, hands with fingers, legs, shoes. */
import type { GeoBuilder } from "../gfx/geo";
import { darker } from "./parts";
import type { Look } from "./appearance";

export function buildUpperArm(ua: GeoBuilder, armR: number, color: string): void {
  // One continuous capsule — avoid ball-joint “toy” look
  ua.capsule(armR * 1.05, 0.18, color, { pos: [0, -0.11, 0] }, 5, 12);
}

export function buildForeArm(
  fa: GeoBuilder,
  armR: number,
  color: string,
  skin: string,
  look: Look,
): void {
  fa.capsule(armR * 0.92, 0.13, color, { pos: [0, -0.105, 0] }, 5, 12);
  if (look.acc & 64) {
    fa.torus(armR * 0.95, 0.007, { color: "#c9a227", rough: 0.35, metal: 0.85 }, { pos: [0, -0.175, 0], rot: [Math.PI / 2, 0, 0] });
    fa.roundBox(0.022, 0.014, 0.005, "#1a1a1a", { pos: [0, -0.175, armR * 0.95] }, 0.002, 2);
  }
  buildHand(fa, skin);
}

function buildHand(fa: GeoBuilder, skin: string): void {
  // Palm + heel
  fa.sphere(0.04, skin, { pos: [0, -0.228, 0.014], scale: [1.2, 0.88, 0.95] }, 14);
  fa.sphere(0.03, darker(skin, 0.95), { pos: [0, -0.258, 0.022], scale: [1.4, 0.5, 0.8] }, 10);
  // Four fingers — proximal + distal, gentle curl
  for (let f = 0; f < 4; f += 1) {
    const fx = (f - 1.5) * 0.015;
    const len = f === 1 || f === 2 ? 0.022 : 0.018;
    fa.capsule(0.007, len, skin, { pos: [fx, -0.292, 0.034], rot: [0.4, 0, 0] }, 3, 8);
    fa.capsule(0.006, len * 0.7, skin, { pos: [fx, -0.318, 0.048], rot: [0.65, 0, 0] }, 3, 8);
  }
  // Opposable thumb
  fa.capsule(0.0075, 0.018, skin, { pos: [0.034, -0.252, 0.01], rot: [0.15, 0.35, 1.1] }, 3, 8);
  fa.capsule(0.0065, 0.014, skin, { pos: [0.046, -0.268, 0.024], rot: [0.4, 0.15, 0.85] }, 3, 8);
}

export function buildThigh(th: GeoBuilder, legR: number, color: string): void {
  th.capsule(legR * 1.12, 0.25, color, { pos: [0, -0.17, 0] }, 5, 12);
  th.sphere(legR * 1.2, color, { pos: [0, -0.02, 0], scale: [1.05, 0.55, 1.05] }, 12);
}

export function buildShin(
  sh: GeoBuilder,
  legR: number,
  color: string,
  shoeCol: string,
  shoeStyle: number,
  skin: string,
): void {
  sh.capsule(legR * 0.98, 0.22, color, { pos: [0, -0.155, 0] }, 5, 12);
  // Knee
  sh.sphere(legR * 0.95, darker(color, 0.95), { pos: [0, -0.02, 0.01], scale: [1, 0.7, 1.05] }, 10);
  // Ankle
  sh.sphere(legR * 0.75, darker(color, 0.92), { pos: [0, -0.34, 0], scale: [1, 0.7, 1] }, 10);
  if (shoeStyle === 2) {
    // Chappals
    sh.roundBox(0.078, 0.014, 0.2, shoeCol, { pos: [0, -0.4, 0.035] }, 0.006, 2);
    sh.roundBox(0.012, 0.01, 0.05, darker(shoeCol, 0.7), { pos: [0.02, -0.388, 0.05], rot: [0, 0, 0.4] }, 0.003, 2);
    sh.roundBox(0.012, 0.01, 0.05, darker(shoeCol, 0.7), { pos: [-0.02, -0.388, 0.05], rot: [0, 0, -0.4] }, 0.003, 2);
    sh.sphere(0.032, skin, { pos: [0, -0.385, -0.02], scale: [1.15, 0.7, 1.1] }, 10);
  } else if (shoeStyle === 1) {
    sh.roundBox(0.088, 0.055, 0.22, shoeCol, { pos: [0, -0.38, 0.04] }, 0.012, 3);
    sh.sphere(0.04, shoeCol, { pos: [0, -0.38, 0.14], scale: [1, 0.7, 1] }, 10);
    sh.roundBox(0.09, 0.012, 0.22, darker(shoeCol, 0.55), { pos: [0, -0.41, 0.04] }, 0.004, 2);
  } else {
    // Sneakers
    sh.roundBox(0.092, 0.055, 0.22, shoeCol, { pos: [0, -0.375, 0.04] }, 0.014, 3);
    sh.roundBox(0.096, 0.014, 0.225, "#f5f5f5", { pos: [0, -0.408, 0.04] }, 0.006, 2);
    sh.sphere(0.042, shoeCol, { pos: [0, -0.375, 0.14], scale: [1.05, 0.72, 1] }, 12);
    sh.roundBox(0.07, 0.02, 0.04, darker(shoeCol, 0.85), { pos: [0, -0.355, 0.02] }, 0.004, 2);
  }
}
