/** Torso garments + body-worn accessories. */
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
  const torsoW = (t === 2 ? 0.2 : 0.185) * bw;

  tg.cyl(torsoW, 0.155 * bw, shoulder - hips + 0.05, top, { pos: [0, (shoulder + hips) / 2, 0], scale: [1, 1, 0.62] }, 20);
  tg.sphere(torsoW * 1.02, top, { pos: [0, hips + 0.06, 0], scale: [1, 0.5, 0.68] }, 14);
  tg.cyl(0.045, 0.05, 0.075, skin, { pos: [0, shoulder + 0.035, 0] }, 12);
  tg.sphere(torsoW * 1.04, top, { pos: [0, shoulder - 0.01, 0], scale: [1.06, 0.34, 0.7] }, 16);

  if (t === 1) {
    tg.roundBox(0.15, 0.025, 0.1, "#f4f4f0", { pos: [0, shoulder + 0.01, 0.03] }, 0.008, 2);
    tg.roundBox(0.01, 0.36, 0.01, darker(top, 0.8), { pos: [0, 1.12, 0.115 * bw] }, 0.003, 2);
  }
  if (t === 2) {
    tg.sphere(0.115, top, { pos: [0, shoulder + 0.03, -0.065], scale: [1.15, 0.8, 0.9] }, 12);
    tg.roundBox(0.17 * bw, 0.08, 0.018, darker(top, 0.82), { pos: [0, 0.98, 0.125 * bw] }, 0.006, 2);
  }
  if (t === 3) {
    tg.cyl(0.165 * bw, 0.24 * bw, 0.48, top, { pos: [0, 0.64, 0], scale: [1, 1, 0.74] }, 18);
    tg.cyl(0.052, 0.055, 0.032, darker(top, 0.85), { pos: [0, shoulder + 0.055, 0] }, 10);
  }
  if (saree) {
    tg.cyl(0.165 * bw, 0.245 * bw, 0.78, top, { pos: [0, 0.5, 0], scale: [1, 1, 0.8] }, 18);
    tg.roundBox(0.07, 0.62, 0.014, darker(top, 0.72), { pos: [0.05, 1.08, 0.12 * bw], rot: [0, 0, -0.55] }, 0.005, 2);
    tg.roundBox(0.21 * bw, 0.035, 0.04, "#e2b64a", { pos: [0, 0.22, 0.175 * bw] }, 0.01, 2);
  }
  if (t === 5) {
    tg.roundBox(0.075, 0.04, 0.01, "#f4f4f0", { pos: [0.07 * bw, 1.22, 0.12 * bw] }, 0.004, 2);
    tg.sphere(0.014, "#f2c230", { pos: [0.065 * bw, 1.22, 0.125 * bw] }, 8);
  }
  if (t === 6) {
    tg.cyl(torsoW * 1.06, 0.175 * bw, shoulder - hips + 0.05, darker(top, 0.9), {
      pos: [0, (shoulder + hips) / 2, 0],
      scale: [1, 1, 0.68],
    }, 16);
    tg.roundBox(0.06, 0.32, 0.016, darker(top, 0.7), { pos: [0.05 * bw, 1.15, 0.12 * bw], rot: [0, 0, -0.35] }, 0.005, 2);
    tg.roundBox(0.06, 0.32, 0.016, darker(top, 0.7), { pos: [-0.05 * bw, 1.15, 0.12 * bw], rot: [0, 0, 0.35] }, 0.005, 2);
    tg.roundBox(0.14 * bw, 0.028, 0.03, "#f4efe2", { pos: [0, 1.0, 0.125 * bw] }, 0.008, 2);
  }

  if (b === 1) tg.cyl(0.16 * bw, 0.16 * bw, 0.03, "#151515", { pos: [0, hips + 0.02, 0], scale: [1, 1, 0.66] }, 16);
  if (b === 3 && !saree) tg.cyl(0.16 * bw, 0.25 * bw, 0.36, bottom, { pos: [0, hips - 0.15, 0], scale: [1, 1, 0.8] }, 18);
  if (b === 4 && !saree) {
    tg.cyl(0.175 * bw, 0.235 * bw, 0.76, bottom, { pos: [0, hips - 0.35, 0], scale: [1, 1, 0.8] }, 18);
    tg.roundBox(0.27 * bw, 0.025, 0.035, "#e2b64a", { pos: [0, hips - 0.72, 0.155 * bw] }, 0.008, 2);
  }
  if (!saree && b !== 3 && b !== 4) {
    tg.cyl(0.158 * bw, 0.158 * bw, 0.22, bottom, { pos: [0, hips - 0.02, 0], scale: [1, 1, 0.68] }, 16);
  }

  if (look.acc & 2) {
    tg.roundBox(0.012, 0.26, 0.008, "#e63946", { pos: [-0.04, 1.2, 0.112 * bw], rot: [0, 0, -0.2] }, 0.003, 2);
    tg.roundBox(0.012, 0.26, 0.008, "#e63946", { pos: [0.04, 1.2, 0.112 * bw], rot: [0, 0, 0.2] }, 0.003, 2);
    tg.roundBox(0.045, 0.06, 0.01, "#fafafa", { pos: [0, 1.05, 0.12 * bw] }, 0.004, 2);
    tg.roundBox(0.045, 0.015, 0.011, "#1d4e89", { pos: [0, 1.068, 0.122 * bw] }, 0.003, 2);
  }
  if (look.acc & 4) {
    tg.roundBox(0.2 * bw, 0.28, 0.09, "#22313f", { pos: [0, 1.1, -0.14 * bw] }, 0.03, 3);
    tg.roundBox(0.15 * bw, 0.08, 0.02, "#2f4558", { pos: [0, 1.05, -0.19 * bw] }, 0.01, 2);
    tg.roundBox(0.02, 0.24, 0.03, "#22313f", { pos: [-0.085 * bw, 1.18, 0.06 * bw] }, 0.008, 2);
    tg.roundBox(0.02, 0.24, 0.03, "#22313f", { pos: [0.085 * bw, 1.18, 0.06 * bw] }, 0.008, 2);
  }

  return { shoulder, torsoW };
}
