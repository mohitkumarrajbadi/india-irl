/** Soft Memoji torso + garments that seat cleanly on hips/shoulders. */
import type { GeoBuilder } from "../gfx/geo";
import { darker, HIP_Y } from "./parts";
import type { Look } from "./appearance";

export function buildTorso(
  tg: GeoBuilder,
  look: Look,
  skin: string,
  top: string,
  bottom: string,
  bw: number,
): { shoulder: number; torsoW: number } {
  const t = look.top;
  const b = look.bottom;
  const saree = t === 4;
  const hips = HIP_Y;
  const shoulder = 1.32;
  const torsoW = (t === 2 ? 0.2 : t === 6 ? 0.195 : t === 3 ? 0.185 : 0.178) * bw;
  const midY = (shoulder + hips) / 2;
  const torsoH = shoulder - hips + 0.04;

  // Base body — skipped for kurta/saree (those garments ARE the silhouette)
  if (t !== 3 && !saree) {
    tg.cyl(torsoW * 0.98, torsoW * 1.04, torsoH + 0.04, top, {
      pos: [0, midY, 0.012],
      scale: [1, 1, 0.72],
    }, 28);
  }

  // Shoulder shelf — fabric bridge into the arm
  for (const sx of [1, -1] as const) {
    tg.sphere(torsoW * 0.58, top, {
      pos: [sx * torsoW * 0.85, shoulder - 0.02, 0],
      scale: [0.95, 0.7, 1.05],
    }, 12);
    tg.sphere(torsoW * 0.38, top, {
      pos: [sx * torsoW * 0.68, shoulder - 0.1, 0.02],
      scale: [0.95, 0.95, 1],
    }, 10);
  }

  // Neck stump
  tg.cyl(0.05, 0.054, 0.08, skin, { pos: [0, shoulder + 0.045, 0] }, 12);
  tg.sphere(0.056, skin, { pos: [0, shoulder + 0.02, 0], scale: [1, 0.55, 1] }, 10);

  // —— Tops ——
  if (t === 0 || t === 5) {
    tg.torus(0.055, 0.012, darker(top, 0.88), {
      pos: [0, shoulder + 0.02, 0.01],
      rot: [Math.PI / 2, 0, 0],
    });
    if (t === 5) {
      tg.roundBox(0.07, 0.038, 0.01, "#f4f4f0", { pos: [0.07 * bw, 1.18, 0.12 * bw] }, 0.005, 2);
      tg.sphere(0.012, "#f2c230", { pos: [0.065 * bw, 1.18, 0.128 * bw] }, 8);
    }
  }
  if (t === 1) {
    tg.roundBox(0.14, 0.022, 0.09, "#f4f4f0", { pos: [0, shoulder + 0.015, 0.035] }, 0.008, 2);
    tg.roundBox(0.012, 0.34, 0.01, darker(top, 0.82), { pos: [0, 1.1, 0.12 * bw] }, 0.003, 2);
    for (let i = 0; i < 4; i += 1) {
      tg.sphere(0.006, "#e2b64a", { pos: [0, 1.22 - i * 0.08, 0.125 * bw] }, 6);
    }
  }
  if (t === 2) {
    tg.sphere(0.125, top, { pos: [0, shoulder + 0.05, -0.05], scale: [1.15, 0.8, 0.9] }, 14);
    tg.sphere(0.075, darker(top, 0.9), { pos: [0, shoulder + 0.03, -0.09], scale: [1.05, 0.65, 0.65] }, 12);
    tg.roundBox(0.15 * bw, 0.085, 0.022, darker(top, 0.85), { pos: [0, 0.98, 0.125 * bw] }, 0.012, 2);
    tg.cyl(0.018, 0.018, 0.11, darker(top, 0.75), { pos: [-0.03, 1.16, 0.1], rot: [0.4, 0, 0.2] }, 6);
    tg.cyl(0.018, 0.018, 0.11, darker(top, 0.75), { pos: [0.03, 1.16, 0.1], rot: [0.4, 0, -0.2] }, 6);
    tg.cyl(torsoW * 1.05, torsoW * 1.08, 0.055, darker(top, 0.92), {
      pos: [0, hips + 0.08, 0.01],
      scale: [1, 1, 0.72],
    }, 16);
  }
  if (t === 3) {
    // Kurta IS the body — wide continuous tunic from shoulders past the hips
    tg.cyl(torsoW * 1.05, 0.3 * bw, shoulder - 0.15, top, {
      pos: [0, (shoulder + 0.15) / 2, 0.01],
      scale: [1, 1, 0.8],
    }, 26);
    tg.cyl(0.05, 0.054, 0.028, darker(top, 0.88), { pos: [0, shoulder + 0.05, 0.01] }, 10);
    tg.roundBox(0.01, 0.42, 0.008, darker(top, 0.78), { pos: [0, 1.02, 0.125 * bw] }, 0.003, 2);
  }
  if (saree) {
    // Saree IS the body — one continuous drape
    tg.cyl(torsoW * 1.05, 0.27 * bw, shoulder - 0.05, top, {
      pos: [0, (shoulder + 0.05) / 2, 0],
      scale: [1, 1, 0.82],
    }, 26);
    tg.roundBox(0.07, 0.58, 0.016, darker(top, 0.72), {
      pos: [0.05, 1.05, 0.12 * bw],
      rot: [0, 0, -0.5],
    }, 0.006, 2);
    tg.roundBox(0.1, 0.45, 0.016, darker(top, 0.68), {
      pos: [-0.02, 0.98, -0.11 * bw],
      rot: [0.12, 0.35, 0.15],
    }, 0.006, 2);
    tg.roundBox(0.22 * bw, 0.038, 0.042, "#e2b64a", { pos: [0, 0.18, 0.18 * bw] }, 0.012, 2);
    tg.sphere(0.02, "#e2b64a", { pos: [0.09 * bw, 1.28, 0.11 * bw] }, 8);
    tg.cyl(torsoW * 1.05, torsoW * 1.05, 0.14, darker(top, 0.9), {
      pos: [0, shoulder - 0.1, 0.02],
      scale: [1, 1, 0.72],
    }, 16);
  }
  if (t === 6) {
    tg.cyl(torsoW * 1.1, 0.18 * bw, torsoH + 0.04, darker(top, 0.94), {
      pos: [0, midY - 0.01, 0.015],
      scale: [1, 1, 0.74],
    }, 20);
    tg.roundBox(0.055, 0.3, 0.016, darker(top, 0.72), {
      pos: [0.05 * bw, 1.12, 0.125 * bw],
      rot: [0, 0, -0.32],
    }, 0.005, 2);
    tg.roundBox(0.055, 0.3, 0.016, darker(top, 0.72), {
      pos: [-0.05 * bw, 1.12, 0.125 * bw],
      rot: [0, 0, 0.32],
    }, 0.005, 2);
    tg.roundBox(0.13 * bw, 0.026, 0.028, "#f4efe2", { pos: [0, 0.98, 0.13 * bw] }, 0.008, 2);
    tg.roundBox(0.035, 0.028, 0.008, "#b3261e", { pos: [0.07 * bw, 1.2, 0.132 * bw] }, 0.004, 2);
  }

  // —— Bottoms ——
  const underKurta = t === 3;
  if (!saree) {
    if ((b === 0 || b === 1 || b === 5) && !underKurta) {
      tg.cyl(0.175 * bw, 0.175 * bw, 0.22, bottom, { pos: [0, hips - 0.01, 0], scale: [1, 1, 0.74] }, 20);
      tg.cyl(0.178 * bw, 0.178 * bw, 0.036, darker(bottom, b === 1 ? 0.35 : 0.85), {
        pos: [0, hips + 0.1, 0],
        scale: [1, 1, 0.74],
      }, 16);
      if (b === 1) {
        tg.roundBox(0.02, 0.028, 0.012, "#c9a227", { pos: [0, hips + 0.1, 0.12 * bw] }, 0.004, 2);
      }
    }
    if (b === 2) {
      // Longer shorts so the thigh joint stays covered
      tg.cyl(0.175 * bw, 0.2 * bw, 0.3, bottom, { pos: [0, hips - 0.06, 0], scale: [1, 1, 0.78] }, 18);
      tg.cyl(0.178 * bw, 0.178 * bw, 0.03, darker(bottom, 0.88), {
        pos: [0, hips + 0.08, 0],
        scale: [1, 1, 0.78],
      }, 14);
    }
    if (b === 3) {
      tg.cyl(0.17 * bw, 0.25 * bw, 0.4, bottom, { pos: [0, hips - 0.16, 0], scale: [1, 1, 0.84] }, 20);
      tg.cyl(0.17 * bw, 0.17 * bw, 0.03, darker(bottom, 0.88), {
        pos: [0, hips + 0.06, 0],
        scale: [1, 1, 0.76],
      }, 14);
    }
    if (b === 4) {
      tg.cyl(0.18 * bw, 0.24 * bw, 0.78, bottom, { pos: [0, hips - 0.36, 0], scale: [1, 1, 0.82] }, 20);
      tg.roundBox(0.26 * bw, 0.028, 0.036, "#e2b64a", { pos: [0, hips - 0.7, 0.16 * bw] }, 0.01, 2);
    }
  }

  // —— Accessories ——
  if (look.acc & 2) {
    tg.roundBox(0.012, 0.24, 0.008, "#e63946", { pos: [-0.04, 1.18, 0.115 * bw], rot: [0, 0, -0.18] }, 0.003, 2);
    tg.roundBox(0.012, 0.24, 0.008, "#e63946", { pos: [0.04, 1.18, 0.115 * bw], rot: [0, 0, 0.18] }, 0.003, 2);
    tg.roundBox(0.048, 0.062, 0.012, "#fafafa", { pos: [0, 1.04, 0.125 * bw] }, 0.005, 2);
    tg.roundBox(0.048, 0.016, 0.013, "#1d4e89", { pos: [0, 1.058, 0.128 * bw] }, 0.003, 2);
  }
  if (look.acc & 4) {
    tg.roundBox(0.2 * bw, 0.28, 0.09, "#22313f", { pos: [0, 1.08, -0.145 * bw] }, 0.035, 3);
    tg.roundBox(0.14 * bw, 0.07, 0.02, "#2f4558", { pos: [0, 1.02, -0.195 * bw] }, 0.01, 2);
    tg.roundBox(0.022, 0.22, 0.03, "#22313f", { pos: [-0.09 * bw, 1.16, 0.05 * bw] }, 0.008, 2);
    tg.roundBox(0.022, 0.22, 0.03, "#22313f", { pos: [0.09 * bw, 1.16, 0.05 * bw] }, 0.008, 2);
  }

  return { shoulder, torsoW };
}
