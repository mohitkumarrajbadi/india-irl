/** Chunky sculpted hair locks — Memoji / clay volumes, not strands. */
import * as THREE from "three";
import type { GeoBuilder } from "../gfx/geo";
import { darker, FACE_Z, HC } from "./parts";
import { TOP_COLORS, type Look } from "./appearance";

/**
 * Solid hair bowl sat high on the crown.
 * Bottom edge stays above the brows (≈ HC+0.06) so face/brows stay clear.
 */
function scalp(
  hg: GeoBuilder,
  color: string,
  yOff = 0.145,
  r = 0.118,
  s: [number, number, number] = [1.18, 0.62, 1.14],
): void {
  hg.sphere(r, color, {
    pos: [0, HC + yOff, -0.028],
    scale: s,
  }, 22);
}

/** Soft top mound for styled volume. */
function crown(hg: GeoBuilder, color: string, y = HC + 0.155, z = -0.02, sx = 1.05, sy = 0.55, sz = 0.95): void {
  hg.sphere(0.055, color, { pos: [0, y, z], scale: [sx, sy, sz] }, 14);
}

/** One clay lock — rounded volume. */
function lock(
  hg: GeoBuilder,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rot: [number, number, number] = [0, 0, 0],
): void {
  hg.sphere(0.045, color, { pos: [x, y, z], scale: [sx, sy, sz], rot }, 14);
}

export function buildHair(hg: GeoBuilder, look: Look, hair: string): void {
  const top = TOP_COLORS[look.topColor];
  const shade = darker(hair, 0.85);
  switch (look.hair) {
    case 0: // Crop
      scalp(hg, hair, 0.138, 0.118, [1.16, 0.62, 1.12]);
      lock(hg, hair, 0.08, HC + 0.07, 0.0, 0.6, 0.65, 0.5);
      lock(hg, hair, -0.08, HC + 0.07, 0.0, 0.6, 0.65, 0.5);
      lock(hg, hair, 0.09, HC + 0.04, -0.02, 0.45, 0.75, 0.4);
      lock(hg, hair, -0.09, HC + 0.04, -0.02, 0.45, 0.75, 0.4);
      break;
    case 1: // Long — middle part + braids
      scalp(hg, hair, 0.142, 0.118, [1.18, 0.62, 1.12]);
      lock(hg, hair, 0.045, HC + 0.12, 0.01, 0.7, 0.55, 0.6);
      lock(hg, hair, -0.045, HC + 0.12, 0.01, 0.7, 0.55, 0.6);
      for (const sx of [1, -1] as const) {
        hg.capsule(0.028, 0.28, hair, { pos: [sx * 0.095, HC - 0.12, 0.05], rot: [0.35, 0, sx * 0.15] }, 5, 10);
        hg.capsule(0.024, 0.12, shade, { pos: [sx * 0.105, HC - 0.28, 0.09], rot: [0.5, 0, sx * 0.1] }, 4, 8);
        hg.torus(0.02, 0.007, "#5b8fd9", { pos: [sx * 0.105, HC - 0.36, 0.11], rot: [Math.PI / 2, 0, 0] });
      }
      break;
    case 2: // Bun
      scalp(hg, hair, 0.14, 0.115, [1.14, 0.58, 1.1]);
      hg.sphere(0.058, hair, { pos: [0, HC + 0.175, -0.055], scale: [1.02, 0.9, 0.98] }, 16);
      hg.torus(0.034, 0.01, shade, { pos: [0, HC + 0.148, -0.05], rot: [Math.PI / 2, 0, 0] });
      break;
    case 3: // Curly
      scalp(hg, hair, 0.148, 0.12, [1.2, 0.68, 1.15]);
      crown(hg, hair, HC + 0.168, -0.01, 1.1, 0.6, 1.0);
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        lock(hg, hair, Math.sin(a) * 0.1, HC + 0.12 + (i % 3) * 0.015, Math.cos(a) * 0.08 - 0.025, 0.8, 0.8, 0.8);
      }
      break;
    case 4: // Pagri
      // Thin hair under-wrap so skin never peeks at the rim
      scalp(hg, hair, 0.12, 0.11, [1.1, 0.5, 1.05]);
      lock(hg, hair, 0, HC + 0.04, -0.08, 1.15, 0.4, 0.55);
      hg.sphere(0.148, top, { pos: [0, HC + 0.08, -0.012], scale: [1.16, 0.78, 1.2] }, 22);
      hg.torus(0.142, 0.02, darker(top, 0.82), { pos: [0, HC + 0.055, 0.005], rot: [Math.PI / 2 - 0.08, 0, 0] });
      hg.torus(0.132, 0.016, darker(top, 1.05), { pos: [0, HC + 0.11, 0], rot: [Math.PI / 2 + 0.1, 0, 0] });
      hg.sphere(0.05, top, { pos: [0, HC + 0.185, 0.006] }, 14);
      break;
    case 5: // Cap
      scalp(hg, hair, 0.1, 0.1, [1.05, 0.45, 1.02]);
      hg.sphere(0.14, top, { pos: [0, HC + 0.075, -0.012], scale: [1.1, 0.7, 1.12] }, 18);
      hg.roundBox(0.155, 0.012, 0.115, top, { pos: [0, HC + 0.06, 0.11], rot: [0.08, 0, 0] }, 0.006, 2);
      lock(hg, hair, 0.088, HC + 0.02, -0.055, 0.5, 0.95, 0.65);
      lock(hg, hair, -0.088, HC + 0.02, -0.055, 0.5, 0.95, 0.65);
      break;
    case 6: // Bald
      break;
    case 7: // Ponytail
      scalp(hg, hair, 0.142, 0.116, [1.16, 0.6, 1.1]);
      for (let i = 0; i < 5; i += 1) {
        lock(hg, hair, (i - 2) * 0.028, HC + 0.12, -0.045 - i * 0.01, 0.55, 0.65, 0.75, [-0.2, 0, 0]);
      }
      hg.capsule(0.034, 0.24, hair, { pos: [0, HC - 0.02, -0.14], rot: [0.35, 0, 0] }, 5, 10);
      break;
    case 8: // Fade / swoop
      scalp(hg, hair, 0.148, 0.12, [1.2, 0.65, 1.14]);
      crown(hg, shade, HC + 0.17, -0.008, 1.0, 0.5, 0.9);
      lock(hg, shade, 0.045, HC + 0.14, 0.02, 0.7, 0.55, 0.65, [0.1, 0.2, 0.05]);
      lock(hg, shade, -0.045, HC + 0.14, 0.02, 0.7, 0.55, 0.65, [0.1, -0.2, -0.05]);
      lock(hg, hair, 0.055, HC + 0.08, -0.045, 0.55, 0.75, 0.6);
      lock(hg, hair, -0.055, HC + 0.08, -0.045, 0.55, 0.75, 0.6);
      break;
    case 9: // Hijab
      hg.sphere(0.148, top, { pos: [0, HC + 0.02, -0.01], scale: [1.12, 1.14, 1.12] }, 22);
      hg.sphere(0.108, top, { pos: [0, HC - 0.085, -0.05], scale: [1.25, 1.35, 0.9] }, 16);
      hg.roundBox(0.19, 0.045, 0.022, darker(top, 0.9), { pos: [0, HC + 0.005, FACE_Z - 0.008] }, 0.01, 2);
      break;
    default:
      scalp(hg, hair);
  }
}
