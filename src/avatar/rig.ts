import * as THREE from "three";
import { GeoBuilder, vertexMat } from "../gfx/geo";
import {
  BOTTOM_COLORS,
  HAIR_COLORS,
  SHOE_COLORS,
  SKIN_TONES,
  TOP_COLORS,
  lookKey,
  type Look,
} from "./appearance";

export type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  torso: THREE.Mesh;
  lArm: THREE.Group;
  rArm: THREE.Group;
  lElbow: THREE.Group;
  rElbow: THREE.Group;
  lLeg: THREE.Group;
  rLeg: THREE.Group;
  lKnee: THREE.Group;
  rKnee: THREE.Group;
  cup: THREE.Mesh;
  meshes: THREE.Mesh[];
  /** Smoothed joint angles, see `JOINTS`. */
  cur: Float32Array;
  /** Highest point of the avatar, for name tags. */
  height: number;
};

type Geos = {
  torso: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  upperArm: THREE.BufferGeometry;
  foreArm: THREE.BufferGeometry;
  thigh: THREE.BufferGeometry;
  shin: THREE.BufferGeometry;
  cup: THREE.BufferGeometry;
  height: number;
  shoulder: number;
  hipX: number;
};

const cache = new Map<string, Geos>();

const darker = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);
const BODY_W = [0.86, 0.96, 1.12];
const BODY_H = [1.02, 1, 0.98];
/** Extra head scale for a cuter, slightly chibi silhouette. */
const HEAD_SCALE = 1.22;

function buildGeos(look: Look): Geos {
  const bw = BODY_W[look.body];
  const bh = BODY_H[look.body];
  const skin = SKIN_TONES[look.skin];
  const skinShade = darker(skin, 0.88);
  const skinWarm = new THREE.Color(skin).lerp(new THREE.Color("#e8a090"), 0.22).getStyle();
  const hair = HAIR_COLORS[look.hairColor];
  const top = TOP_COLORS[look.topColor];
  const bottom = BOTTOM_COLORS[look.bottomColor];
  const shoeCol = SHOE_COLORS[look.shoeColor];
  const t = look.top;
  const b = look.bottom;
  const longSleeve = t === 1 || t === 2 || t === 3 || t === 6;
  const saree = t === 4;
  const hips = 0.9;
  const shoulder = 1.38;
  const torsoW = (t === 2 ? 0.2 : 0.185) * bw;

  // ---- torso (absolute body space, y up from the ground) ----
  const tg = new GeoBuilder();
  const torsoCol = saree ? top : top;
  tg.cyl(torsoW, 0.16 * bw, shoulder - hips + 0.05, torsoCol, { pos: [0, (shoulder + hips) / 2, 0], scale: [1, 1, 0.62] }, 16);
  // Soft waist tuck so the silhouette reads more like a person
  tg.sphere(torsoW * 1.05, torsoCol, { pos: [0, hips + 0.08, 0], scale: [1, 0.55, 0.7] }, 12);
  tg.cyl(0.048, 0.052, 0.08, skin, { pos: [0, shoulder + 0.04, 0] }, 10);
  tg.sphere(torsoW * 1.05, torsoCol, { pos: [0, shoulder - 0.01, 0], scale: [1.05, 0.36, 0.7] }, 14);
  if (t === 1) {
    tg.box(0.16, 0.028, 0.11, "#f4f4f0", { pos: [0, shoulder + 0.01, 0.03] });
    tg.box(0.012, 0.38, 0.012, darker(top, 0.8), { pos: [0, 1.12, 0.118 * bw] });
  }
  if (t === 2) {
    tg.sphere(0.12, top, { pos: [0, shoulder + 0.03, -0.07], scale: [1.15, 0.8, 0.9] }, 10);
    tg.box(0.18 * bw, 0.09, 0.02, darker(top, 0.82), { pos: [0, 0.98, 0.128 * bw] });
  }
  if (t === 3) {
    tg.cyl(0.17 * bw, 0.245 * bw, 0.5, top, { pos: [0, 0.64, 0], scale: [1, 1, 0.74] }, 16);
    tg.cyl(0.055, 0.058, 0.035, darker(top, 0.85), { pos: [0, shoulder + 0.06, 0] }, 8);
    tg.box(0.035, 0.45, 0.012, darker(top, 0.75), { pos: [0, 1.1, 0.122 * bw] });
  }
  if (saree) {
    tg.cyl(0.17 * bw, 0.25 * bw, 0.8, top, { pos: [0, 0.5, 0], scale: [1, 1, 0.8] }, 16);
    tg.box(0.075, 0.65, 0.016, darker(top, 0.72), { pos: [0.05, 1.08, 0.122 * bw], rot: [0, 0, -0.55] });
    tg.box(0.11, 0.5, 0.018, darker(top, 0.68), { pos: [-0.02, 1.0, -0.13 * bw], rot: [0.15, 0.4, 0.2] });
    tg.box(0.22 * bw, 0.04, 0.045, "#e2b64a", { pos: [0, 0.22, 0.18 * bw] });
    tg.box(0.035, 0.035, 0.035, "#e2b64a", { pos: [0.1 * bw, 1.3, 0.115 * bw] });
  }
  if (t === 5) {
    tg.box(0.08, 0.045, 0.012, "#f4f4f0", { pos: [0.075 * bw, 1.22, 0.122 * bw] });
    tg.box(0.028, 0.028, 0.012, "#f2c230", { pos: [0.07 * bw, 1.22, 0.128 * bw] });
  }
  if (t === 6) {
    tg.cyl(torsoW * 1.08, 0.18 * bw, shoulder - hips + 0.06, darker(top, 0.88), { pos: [0, (shoulder + hips) / 2, 0], scale: [1, 1, 0.7] }, 14);
    tg.box(0.065, 0.35, 0.018, darker(top, 0.7), { pos: [0.055 * bw, 1.15, 0.122 * bw], rot: [0, 0, -0.35] });
    tg.box(0.065, 0.35, 0.018, darker(top, 0.7), { pos: [-0.055 * bw, 1.15, 0.122 * bw], rot: [0, 0, 0.35] });
    tg.box(0.15 * bw, 0.032, 0.035, "#f4efe2", { pos: [0, 1.0, 0.128 * bw] });
  }
  // bottom garments that live on the hips
  if (b === 1) tg.cyl(0.165 * bw, 0.165 * bw, 0.032, "#151515", { pos: [0, hips + 0.02, 0], scale: [1, 1, 0.66] }, 14);
  if (b === 3 && !saree) tg.cyl(0.165 * bw, 0.255 * bw, 0.38, bottom, { pos: [0, hips - 0.16, 0], scale: [1, 1, 0.8] }, 16);
  if (b === 4 && !saree) tg.cyl(0.18 * bw, 0.24 * bw, 0.78, bottom, { pos: [0, hips - 0.36, 0], scale: [1, 1, 0.8] }, 16);
  if (b === 4 && !saree) tg.box(0.28 * bw, 0.028, 0.038, "#e2b64a", { pos: [0, hips - 0.74, 0.16 * bw] });
  if (!saree && b !== 3 && b !== 4) tg.cyl(0.162 * bw, 0.162 * bw, 0.24, bottom, { pos: [0, hips - 0.02, 0], scale: [1, 1, 0.68] }, 14);
  // accessories on the torso
  if (look.acc & 2) {
    tg.box(0.014, 0.28, 0.01, "#e63946", { pos: [-0.045, 1.22, 0.115 * bw], rot: [0, 0, -0.2] });
    tg.box(0.014, 0.28, 0.01, "#e63946", { pos: [0.045, 1.22, 0.115 * bw], rot: [0, 0, 0.2] });
    tg.box(0.05, 0.068, 0.012, "#fafafa", { pos: [0, 1.05, 0.122 * bw] });
    tg.box(0.05, 0.018, 0.013, "#1d4e89", { pos: [0, 1.072, 0.125 * bw] });
  }
  if (look.acc & 4) {
    tg.box(0.22 * bw, 0.3, 0.1, "#22313f", { pos: [0, 1.12, -0.145 * bw] });
    tg.box(0.16 * bw, 0.09, 0.022, "#2f4558", { pos: [0, 1.06, -0.2 * bw] });
    tg.box(0.022, 0.26, 0.035, "#22313f", { pos: [-0.09 * bw, 1.2, 0.07 * bw] });
    tg.box(0.022, 0.26, 0.035, "#22313f", { pos: [0.09 * bw, 1.2, 0.07 * bw] });
  }

  // ---- head (cute + proper: rounder skull, big soft eyes, gentle smile) ----
  const hg = new GeoBuilder();
  const hc = 0.168;
  // Round skull + soft jaw (less egg, more plush)
  hg.sphere(0.152, skin, { pos: [0, hc + 0.01, 0], scale: [0.98, 1.05, 1.0] }, 22);
  hg.sphere(0.118, skin, { pos: [0, hc - 0.045, 0.02], scale: [1.05, 0.85, 0.95] }, 16);
  // Apple cheeks + blush
  hg.sphere(0.055, skin, { pos: [0.088, hc - 0.028, 0.078], scale: [0.85, 0.9, 0.8] }, 12);
  hg.sphere(0.055, skin, { pos: [-0.088, hc - 0.028, 0.078], scale: [0.85, 0.9, 0.8] }, 12);
  hg.sphere(0.032, skinWarm, { pos: [0.082, hc - 0.032, 0.1], scale: [1.1, 0.7, 0.55] }, 10);
  hg.sphere(0.032, skinWarm, { pos: [-0.082, hc - 0.032, 0.1], scale: [1.1, 0.7, 0.55] }, 10);
  // Tiny soft nose
  hg.sphere(0.022, skinShade, { pos: [0, hc - 0.012, 0.138], scale: [0.85, 0.95, 1.15] }, 10);
  // Cute ears
  hg.sphere(0.036, skin, { pos: [0.142, hc + 0.005, -0.01], scale: [0.42, 1.05, 0.85] }, 10);
  hg.sphere(0.036, skin, { pos: [-0.142, hc + 0.005, -0.01], scale: [0.42, 1.05, 0.85] }, 10);

  // Big soft eyes pushed forward so they read clearly in preview + game
  for (const sx of [1, -1] as const) {
    const ex = sx * 0.048;
    const ey = hc + 0.032;
    const ez = 0.132;
    // White of the eye — wide & tall (cute)
    hg.sphere(0.036, "#fffaf4", { pos: [ex, ey, ez], scale: [1.2, 1.35, 0.62] }, 14);
    // Warm brown iris + pupil
    hg.sphere(0.02, "#6b4228", { pos: [ex, ey - 0.002, ez + 0.014], scale: [1.05, 1.12, 0.8] }, 12);
    hg.sphere(0.012, "#3a2416", { pos: [ex, ey - 0.002, ez + 0.022], scale: [1, 1.05, 0.85] }, 8);
    hg.sphere(0.007, "#0c0806", { pos: [ex, ey - 0.002, ez + 0.028] }, 6);
    // Catchlights
    hg.sphere(0.0055, "#ffffff", { pos: [ex - sx * 0.007, ey + 0.01, ez + 0.032] }, 5);
    hg.sphere(0.003, "#ffffff", { pos: [ex + sx * 0.006, ey - 0.006, ez + 0.03] }, 4);
    // Soft upper lid (skin, not hair — avoids “black dots”)
    hg.sphere(0.034, darker(skin, 0.9), { pos: [ex, ey + 0.022, ez - 0.004], scale: [1.15, 0.38, 0.55] }, 10);
  }

  // Soft arched brows — above the eyes, not over them
  hg.sphere(0.026, darker(hair, 0.65), { pos: [0.052, hc + 0.078, 0.122], scale: [1.6, 0.26, 0.32], rot: [0, 0, -0.2] }, 8);
  hg.sphere(0.026, darker(hair, 0.65), { pos: [-0.052, hc + 0.078, 0.122], scale: [1.6, 0.26, 0.32], rot: [0, 0, 0.2] }, 8);

  // Gentle smile
  hg.sphere(0.022, "#c45c5c", { pos: [0.018, hc - 0.07, 0.138], scale: [1.35, 0.42, 0.5], rot: [0.12, 0, 0.28] }, 8);
  hg.sphere(0.022, "#c45c5c", { pos: [-0.018, hc - 0.07, 0.138], scale: [1.35, 0.42, 0.5], rot: [0.12, 0, -0.28] }, 8);
  hg.sphere(0.014, "#e88a8a", { pos: [0, hc - 0.066, 0.142], scale: [1.5, 0.32, 0.45] }, 6);

  const cap = (r: number, color: string, rotX = -0.28, y = 0.018, cover = 0.58) =>
    hg.add(new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI * cover), color, {
      pos: [0, hc + y, 0],
      rot: [rotX, 0, 0],
      scale: [1.02, 1.08, 1.02],
    });
  switch (look.hair) {
    case 0:
      cap(0.162, hair);
      // Soft side fringe kept high so eyes stay open
      hg.sphere(0.042, hair, { pos: [0.11, hc + 0.055, 0.06], scale: [0.65, 0.75, 0.5] }, 8);
      hg.sphere(0.042, hair, { pos: [-0.11, hc + 0.055, 0.06], scale: [0.65, 0.75, 0.5] }, 8);
      break;
    case 1:
      cap(0.162, hair);
      hg.sphere(0.1, hair, { pos: [0, hc - 0.08, -0.12], scale: [1.4, 1.6, 0.7] }, 12);
      hg.sphere(0.06, hair, { pos: [0.12, hc - 0.05, -0.04], scale: [0.6, 1.4, 0.8] }, 8);
      hg.sphere(0.06, hair, { pos: [-0.12, hc - 0.05, -0.04], scale: [0.6, 1.4, 0.8] }, 8);
      break;
    case 2:
      cap(0.16, hair);
      hg.sphere(0.075, hair, { pos: [0, hc + 0.155, -0.05], scale: [1.1, 0.95, 1] }, 12);
      break;
    case 3:
      cap(0.158, hair, -0.18, 0.015, 0.52);
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2;
        hg.sphere(0.048, hair, {
          pos: [Math.sin(a) * 0.118, hc + 0.1 + (i % 2) * 0.028, Math.cos(a) * 0.1 - 0.02],
        }, 7);
      }
      hg.sphere(0.075, hair, { pos: [0, hc + 0.16, -0.015] }, 10);
      break;
    case 4:
      hg.sphere(0.178, TOP_COLORS[look.topColor], { pos: [0, hc + 0.07, -0.01], scale: [1.02, 0.88, 1.12] }, 16);
      hg.torus(0.162, 0.024, darker(TOP_COLORS[look.topColor], 0.8), { pos: [0, hc + 0.06, 0], rot: [Math.PI / 2 - 0.12, 0, 0] });
      hg.torus(0.15, 0.02, darker(TOP_COLORS[look.topColor], 1.1), { pos: [0, hc + 0.11, 0], rot: [Math.PI / 2 + 0.18, 0, 0] });
      hg.sphere(0.065, TOP_COLORS[look.topColor], { pos: [0, hc + 0.22, 0.02] }, 10);
      break;
    case 5:
      cap(0.164, TOP_COLORS[look.topColor], -0.16, 0.015, 0.5);
      hg.box(0.18, 0.014, 0.14, TOP_COLORS[look.topColor], { pos: [0, hc + 0.07, 0.145], rot: [0.1, 0, 0] });
      hg.sphere(0.05, hair, { pos: [0.1, hc - 0.02, -0.08], scale: [0.7, 1.2, 0.9] }, 8);
      hg.sphere(0.05, hair, { pos: [-0.1, hc - 0.02, -0.08], scale: [0.7, 1.2, 0.9] }, 8);
      break;
    case 6:
      break;
    case 7:
      cap(0.16, hair);
      hg.capsule(0.042, 0.24, hair, { pos: [0, hc - 0.06, -0.155], rot: [0.28, 0, 0] });
      break;
    case 8:
      cap(0.152, hair, -0.22, 0.02, 0.4);
      hg.sphere(0.095, hair, { pos: [0, hc + 0.13, -0.015], scale: [1.08, 0.72, 1.02] }, 12);
      break;
    case 9:
      hg.sphere(0.168, TOP_COLORS[look.topColor], { pos: [0, hc + 0.025, -0.01], scale: [1.08, 1.18, 1.14] }, 16);
      hg.sphere(0.12, TOP_COLORS[look.topColor], { pos: [0, hc - 0.1, -0.06], scale: [1.35, 1.5, 0.85] }, 12);
      hg.box(0.24, 0.07, 0.035, darker(TOP_COLORS[look.topColor], 0.88), { pos: [0, hc + 0.02, 0.13] });
      break;
    default:
      cap(0.162, hair);
      break;
  }
  if (look.acc & 1) {
    hg.torus(0.04, 0.005, "#1a1a1a", { pos: [0.054, hc + 0.026, 0.132] });
    hg.torus(0.04, 0.005, "#1a1a1a", { pos: [-0.054, hc + 0.026, 0.132] });
    hg.box(0.042, 0.005, 0.005, "#1a1a1a", { pos: [0, hc + 0.034, 0.134] });
  }
  if (look.acc & 8) {
    hg.torus(0.162, 0.012, "#1b1b1b", { pos: [0, hc + 0.02, 0], rot: [0, Math.PI / 2, 0] });
    hg.cyl(0.052, 0.052, 0.04, "#1b1b1b", { pos: [0.155, hc, 0], rot: [0, 0, Math.PI / 2] }, 12);
    hg.cyl(0.052, 0.052, 0.04, "#1b1b1b", { pos: [-0.155, hc, 0], rot: [0, 0, Math.PI / 2] }, 12);
  }
  if (look.acc & 16) hg.sphere(0.012, "#c1121f", { pos: [0, hc + 0.078, 0.14] }, 8);
  if (look.acc & 32) {
    hg.add(
      new THREE.SphereGeometry(0.155, 16, 10, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.42),
      hair,
      { pos: [0, hc - 0.01, 0.008], scale: [0.96, 1.08, 1.02] },
    );
  }
  if (look.acc & 128) {
    hg.torus(0.02, 0.0045, "#e2b64a", { pos: [0.138, hc - 0.015, 0.02], rot: [0, 0, Math.PI / 2] });
    hg.torus(0.02, 0.0045, "#e2b64a", { pos: [-0.138, hc - 0.015, 0.02], rot: [0, 0, Math.PI / 2] });
  }

  // ---- limbs (softer, fuller — less stick-figure) ----
  const armR = (t === 2 ? 0.055 : 0.05) * Math.sqrt(bw);
  const ua = new GeoBuilder();
  ua.capsule(armR, 0.17, longSleeve || saree ? top : top, { pos: [0, -0.135, 0] });
  const fa = new GeoBuilder();
  const foreCol = longSleeve ? top : skin;
  fa.capsule(armR * 0.96, 0.15, foreCol, { pos: [0, -0.115, 0] });
  if (look.acc & 64) {
    fa.torus(0.044, 0.008, "#c9a227", { pos: [0, -0.2, 0], rot: [Math.PI / 2, 0, 0] });
    fa.box(0.026, 0.016, 0.006, "#1a1a1a", { pos: [0, -0.2, 0.042] });
  }
  // Soft rounded hand
  fa.sphere(0.042, skin, { pos: [0, -0.248, 0.012], scale: [1.05, 0.9, 0.95] }, 10);
  fa.sphere(0.028, skin, { pos: [0, -0.29, 0.025], scale: [1.35, 0.7, 0.85] }, 8);
  for (let f = 0; f < 4; f += 1) {
    const fx = (f - 1.5) * 0.014;
    fa.capsule(0.0075, 0.024, skin, { pos: [fx, -0.325, 0.032] });
  }
  fa.capsule(0.0085, 0.02, skin, { pos: [0.032, -0.29, 0.012], rot: [0, 0, 0.85] });

  const legR = (b === 5 ? 0.068 : 0.06) * Math.sqrt(bw);
  const longLeg = b === 0 || b === 1 || b === 5;
  const thighCol = longLeg || b === 2 ? bottom : skin;
  const shinCol = longLeg ? bottom : skin;
  const th = new GeoBuilder();
  th.capsule(legR * 1.12, 0.28, saree ? skin : thighCol, { pos: [0, -0.19, 0] });
  const sh = new GeoBuilder();
  sh.capsule(legR * (b === 5 ? 1.05 : 0.95), 0.26, saree ? skin : shinCol, { pos: [0, -0.17, 0] });
  const shoeStyle = look.shoe;
  if (shoeStyle === 2) {
    sh.box(0.08, 0.016, 0.22, shoeCol, { pos: [0, -0.39, 0.04] });
    sh.box(0.065, 0.01, 0.028, darker(shoeCol, 0.7), { pos: [0, -0.378, 0.065] });
    sh.sphere(0.04, skin, { pos: [0, -0.37, -0.01], scale: [1.1, 0.9, 1] }, 8);
  } else if (shoeStyle === 1) {
    sh.box(0.09, 0.065, 0.23, shoeCol, { pos: [0, -0.37, 0.045] });
    sh.sphere(0.045, shoeCol, { pos: [0, -0.37, 0.145], scale: [1, 0.75, 1] }, 8);
  } else {
    sh.box(0.095, 0.065, 0.23, shoeCol, { pos: [0, -0.365, 0.045] });
    sh.box(0.098, 0.018, 0.235, "#f4f4f4", { pos: [0, -0.392, 0.045] });
    sh.sphere(0.048, shoeCol, { pos: [0, -0.365, 0.145], scale: [1, 0.75, 1] }, 8);
  }

  const cup = new GeoBuilder();
  cup.cyl(0.032, 0.026, 0.065, "#f4f0e6", { pos: [0, 0, 0] }, 10);
  cup.cyl(0.03, 0.03, 0.008, "#8a4b24", { pos: [0, 0.03, 0] }, 10);

  return {
    torso: tg.build(),
    head: hg.build(),
    upperArm: ua.build(),
    foreArm: fa.build(),
    thigh: th.build(),
    shin: sh.build(),
    cup: cup.build(),
    height: (1.62 + 0.22 * HEAD_SCALE) * bh + (look.hair === 4 ? 0.1 : 0),
    shoulder: torsoW + armR * 0.95,
    hipX: 0.088 * bw,
  };
}

export function buildRig(look: Look): Rig {
  const key = lookKey(look);
  let g = cache.get(key);
  if (!g) {
    if (cache.size > 80) cache.clear();
    g = buildGeos(look);
    cache.set(key, g);
  }
  const bh = BODY_H[look.body];
  const mesh = (geo: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(geo, vertexMat);
    m.castShadow = true;
    return m;
  };
  const grp = (x: number, y: number, z = 0) => {
    const o = new THREE.Group();
    o.position.set(x, y, z);
    return o;
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(bh);
  root.add(body);

  const torso = mesh(g.torso);
  body.add(torso);
  const head = grp(0, 1.4);
  const headMesh = mesh(g.head);
  headMesh.scale.setScalar(HEAD_SCALE);
  head.add(headMesh);
  body.add(head);

  const lArm = grp(g.shoulder, 1.35);
  const rArm = grp(-g.shoulder, 1.35);
  const lElbow = grp(0, -0.25);
  const rElbow = grp(0, -0.25);
  const arms = [mesh(g.upperArm), mesh(g.upperArm), mesh(g.foreArm), mesh(g.foreArm)];
  lArm.add(arms[0]);
  rArm.add(arms[1]);
  lElbow.add(arms[2]);
  rElbow.add(arms[3]);
  lArm.add(lElbow);
  rArm.add(rElbow);
  body.add(lArm, rArm);

  const cup = mesh(g.cup);
  cup.castShadow = false;
  cup.position.set(0, -0.265, 0.05);
  cup.visible = false;
  rElbow.add(cup);

  const lLeg = grp(g.hipX, 0.9);
  const rLeg = grp(-g.hipX, 0.9);
  const lKnee = grp(0, -0.4);
  const rKnee = grp(0, -0.4);
  const legs = [mesh(g.thigh), mesh(g.thigh), mesh(g.shin), mesh(g.shin)];
  lLeg.add(legs[0]);
  rLeg.add(legs[1]);
  lKnee.add(legs[2]);
  rKnee.add(legs[3]);
  lLeg.add(lKnee);
  rLeg.add(rKnee);
  body.add(lLeg, rLeg);

  return {
    root,
    body,
    head,
    torso,
    lArm,
    rArm,
    lElbow,
    rElbow,
    lLeg,
    rLeg,
    lKnee,
    rKnee,
    cup,
    meshes: [torso, headMesh, ...arms, ...legs, cup],
    cur: new Float32Array(JOINT_COUNT),
    height: g.height,
  };
}

export const EMOTES = [
  { id: 0, name: "None", key: "" },
  { id: 1, name: "Wave", key: "Z" },
  { id: 2, name: "Namaste", key: "X" },
  { id: 3, name: "Bhangra", key: "C" },
  { id: 4, name: "Chai break", key: "V" },
  { id: 5, name: "Punch", key: "R" },
  { id: 6, name: "Kick", key: "G" },
] as const;

/** Seating poses. */
export const SEAT = { stand: 0, steer: 1, relaxed: 2, rider: 3, pillion: 4 } as const;

// Joint slots in `Rig.cur`.
const J = {
  lArmX: 0, lArmZ: 1, rArmX: 2, rArmZ: 3, lElbX: 4, lElbZ: 5, rElbX: 6, rElbZ: 7,
  lLegX: 8, rLegX: 9, lKneeX: 10, rKneeX: 11, headX: 12, headY: 13, bodyY: 14, bodyRY: 15, bodyRX: 16,
} as const;
const JOINT_COUNT = 17;
const target = new Float32Array(JOINT_COUNT);

export type Pose = {
  /** Walk-cycle phase in radians. */
  phase: number;
  /** Ground speed in m/s. */
  speed: number;
  emote: number;
  /** Seconds since the emote began. */
  emoteT: number;
  seat: number;
  time: number;
  /** Turn rate for leaning, optional. */
  lean?: number;
};

/** Writes target joint angles for the pose and eases the rig toward them. */
export function poseRig(rig: Rig, p: Pose, dt: number): void {
  target.fill(0);
  const T = target;
  const t = p.emoteT;

  if (p.seat === SEAT.stand) {
    const pace = Math.min(p.speed / 4.2, 1.7);
    const idle = pace < 0.08;
    const breath = Math.sin(p.time * 1.7) * 0.012;
    const s = Math.sin(p.phase);
    const swing = s * 0.78 * pace;
    T[J.lLegX] = -swing;
    T[J.rLegX] = swing;
    T[J.lKneeX] = Math.max(0, Math.cos(p.phase)) * 1.05 * pace + 0.04;
    T[J.rKneeX] = Math.max(0, -Math.cos(p.phase)) * 1.05 * pace + 0.04;
    T[J.lArmX] = swing * 0.95;
    T[J.rArmX] = -swing * 0.95;
    T[J.lArmZ] = idle ? 0.08 + Math.sin(p.time * 0.9) * 0.02 : 0.06;
    T[J.rArmZ] = idle ? -0.08 - Math.sin(p.time * 0.9 + 1) * 0.02 : -0.06;
    T[J.lElbX] = -0.22 - 0.55 * pace;
    T[J.rElbX] = -0.22 - 0.55 * pace;
    T[J.bodyY] = Math.abs(s) * 0.05 * pace + breath + (idle ? Math.sin(p.time * 1.7) * 0.008 : 0);
    T[J.bodyRX] = Math.min(0.22, pace * 0.12);
    T[J.bodyRY] = -s * 0.12 * pace;
    T[J.headX] = -T[J.bodyRX] * 0.7 + (idle ? Math.sin(p.time * 0.55) * 0.03 : 0);
    T[J.headY] = idle ? Math.sin(p.time * 0.35) * 0.06 : 0;

    if (p.emote === 1) {
      T[J.rArmX] = 0;
      T[J.rArmZ] = -2.6;
      T[J.rElbZ] = -0.3 + Math.sin(t * 9) * 0.55;
      T[J.rElbX] = 0;
    } else if (p.emote === 2) {
      T[J.lArmX] = T[J.rArmX] = -0.55;
      T[J.lArmZ] = -0.42;
      T[J.rArmZ] = 0.42;
      T[J.lElbX] = T[J.rElbX] = -2.05;
      T[J.headX] = 0.28;
    } else if (p.emote === 3) {
      const w = Math.sin(t * 8.5);
      T[J.bodyY] = Math.abs(w) * 0.16;
      T[J.bodyRY] = Math.sin(t * 4.2) * 0.32;
      T[J.rArmX] = T[J.lArmX] = -0.1;
      T[J.rArmZ] = -2.4 + w * 0.55;
      T[J.lArmZ] = 2.4 + -w * 0.55;
      T[J.rElbX] = T[J.lElbX] = -0.15;
      T[J.lLegX] = -Math.max(0, w) * 0.7;
      T[J.rLegX] = -Math.max(0, -w) * 0.7;
      T[J.lKneeX] = Math.max(0, w) * 1.1;
      T[J.rKneeX] = Math.max(0, -w) * 1.1;
      T[J.headY] = Math.sin(t * 4.2) * 0.3;
    } else if (p.emote === 4) {
      const sip = 0.5 + 0.5 * Math.sin(t * 1.5);
      T[J.rArmX] = -0.7 - sip * 0.35;
      T[J.rArmZ] = 0.2;
      T[J.rElbX] = -1.75 - sip * 0.25;
      T[J.lArmX] = -0.3;
      T[J.lElbX] = -1.0;
      T[J.headX] = -0.12 * sip;
    } else if (p.emote === 5) {
      // Punch — jab then retract.
      const jab = Math.min(1, t * 14);
      const retract = t > 0.18 ? Math.min(1, (t - 0.18) * 6) : 0;
      const punch = jab * (1 - retract * 0.85);
      T[J.rArmX] = -0.35 - punch * 1.15;
      T[J.rArmZ] = -0.15 + punch * 0.35;
      T[J.rElbX] = -0.2 - punch * 0.55;
      T[J.lArmX] = -0.55;
      T[J.lElbX] = -1.1;
      T[J.bodyRY] = punch * 0.35;
      T[J.bodyRX] = punch * 0.12;
      T[J.lLegX] = punch * 0.25;
      T[J.rLegX] = -punch * 0.15;
    } else if (p.emote === 6) {
      // Kick — chamber then extend.
      const kick = Math.min(1, t * 10);
      const settle = t > 0.22 ? Math.min(1, (t - 0.22) * 5) : 0;
      const k = kick * (1 - settle * 0.7);
      T[J.rLegX] = -k * 1.55;
      T[J.rKneeX] = 0.2 + k * 0.35;
      T[J.lLegX] = k * 0.2;
      T[J.lKneeX] = 0.15;
      T[J.rArmX] = -0.4;
      T[J.lArmX] = -0.55;
      T[J.bodyRX] = -k * 0.18;
      T[J.bodyRY] = -k * 0.2;
      T[J.headX] = k * 0.1;
    }
  } else {
    // Seated: knees bent, hips lowered a touch.
    const bike = p.seat >= SEAT.rider;
    T[J.lLegX] = T[J.rLegX] = bike ? -1.05 : -1.5;
    T[J.lKneeX] = T[J.rKneeX] = bike ? 1.15 : 1.55;
    T[J.bodyY] = bike ? -0.1 : -0.17;
    T[J.bodyRX] = p.seat === SEAT.rider ? 0.18 : 0;
    if (p.seat === SEAT.steer) {
      T[J.lArmX] = T[J.rArmX] = -0.95;
      T[J.lElbX] = T[J.rElbX] = -0.55;
      T[J.lArmZ] = -0.08;
      T[J.rArmZ] = 0.08;
      T[J.bodyRY] = (p.lean ?? 0) * 0.35;
    } else if (p.seat === SEAT.rider) {
      T[J.lArmX] = T[J.rArmX] = -1.15;
      T[J.lElbX] = T[J.rElbX] = -0.35;
      T[J.lArmZ] = -0.2;
      T[J.rArmZ] = 0.2;
    } else {
      T[J.lArmX] = T[J.rArmX] = -0.35;
      T[J.lElbX] = T[J.rElbX] = -0.9;
    }
    if (p.emote === 1) {
      T[J.rArmX] = 0;
      T[J.rArmZ] = -2.6;
      T[J.rElbZ] = -0.3 + Math.sin(t * 9) * 0.55;
      T[J.rElbX] = 0;
    } else if (p.emote === 2) {
      T[J.lArmX] = T[J.rArmX] = -0.55;
      T[J.lArmZ] = -0.42;
      T[J.rArmZ] = 0.42;
      T[J.lElbX] = T[J.rElbX] = -2.05;
    } else if (p.emote === 4) {
      T[J.rArmX] = -0.8;
      T[J.rElbX] = -1.9;
    }
  }

  const k = Math.min(1, dt * 14);
  const c = rig.cur;
  for (let i = 0; i < JOINT_COUNT; i += 1) c[i] += (T[i] - c[i]) * k;

  rig.lArm.rotation.set(c[J.lArmX], 0, c[J.lArmZ]);
  rig.rArm.rotation.set(c[J.rArmX], 0, c[J.rArmZ]);
  rig.lElbow.rotation.set(c[J.lElbX], 0, c[J.lElbZ]);
  rig.rElbow.rotation.set(c[J.rElbX], 0, c[J.rElbZ]);
  rig.lLeg.rotation.x = c[J.lLegX];
  rig.rLeg.rotation.x = c[J.rLegX];
  rig.lKnee.rotation.x = c[J.lKneeX];
  rig.rKnee.rotation.x = c[J.rKneeX];
  rig.head.rotation.set(c[J.headX], c[J.headY], 0);
  rig.body.position.y = c[J.bodyY];
  rig.body.rotation.set(c[J.bodyRX], c[J.bodyRY], 0);
  rig.cup.visible = p.emote === 4;
}

