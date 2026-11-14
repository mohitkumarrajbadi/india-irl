/** Chunky sculpted hair locks — Memoji / clay volumes, not strands. */
import * as THREE from "three";
import type { GeoBuilder } from "../gfx/geo";
import { darker, HC, SKULL } from "./parts";
import { TOP_COLORS, type Look } from "./appearance";

function scalp(hg: GeoBuilder, color: string, cover = 0.52, rotX = -0.3): void {
  hg.add(new THREE.SphereGeometry(SKULL.rx * 1.12, 24, 18, 0, Math.PI * 2, 0, Math.PI * cover), color, {
    pos: [0, HC + 0.02, -0.012],
    rot: [rotX, 0, 0],
    scale: [1.08, 1.14, 1.06],
  });
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
  hg.sphere(0.05, color, { pos: [x, y, z], scale: [sx, sy, sz], rot }, 14);
}

export function buildHair(hg: GeoBuilder, look: Look, hair: string): void {
  const top = TOP_COLORS[look.topColor];
  const shade = darker(hair, 0.85);
  switch (look.hair) {
    case 0: // Crop — short clay cap + side locks
      scalp(hg, hair, 0.5, -0.28);
      lock(hg, hair, 0.1, HC + 0.04, 0.04, 0.7, 0.85, 0.55);
      lock(hg, hair, -0.1, HC + 0.04, 0.04, 0.7, 0.85, 0.55);
      lock(hg, shade, 0, HC + 0.12, -0.02, 1.15, 0.55, 0.9);
      break;
    case 1: // Long — middle part + forward braids
      scalp(hg, hair, 0.48, -0.22);
      lock(hg, hair, 0.055, HC + 0.1, 0.02, 0.85, 0.7, 0.7);
      lock(hg, hair, -0.055, HC + 0.1, 0.02, 0.85, 0.7, 0.7);
      for (const sx of [1, -1] as const) {
        hg.capsule(0.032, 0.28, hair, { pos: [sx * 0.1, HC - 0.12, 0.06], rot: [0.35, 0, sx * 0.15] }, 5, 10);
        hg.capsule(0.028, 0.12, shade, { pos: [sx * 0.11, HC - 0.28, 0.1], rot: [0.5, 0, sx * 0.1] }, 4, 8);
        hg.torus(0.022, 0.008, "#5b8fd9", { pos: [sx * 0.11, HC - 0.36, 0.12], rot: [Math.PI / 2, 0, 0] });
      }
      break;
    case 2: // Bun
      scalp(hg, hair, 0.48);
      hg.sphere(0.072, hair, { pos: [0, HC + 0.155, -0.06], scale: [1.05, 0.95, 1] }, 18);
      hg.torus(0.042, 0.014, shade, { pos: [0, HC + 0.125, -0.055], rot: [Math.PI / 2, 0, 0] });
      break;
    case 3: // Curly — chunky blobs
      scalp(hg, hair, 0.45, -0.18);
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * Math.PI * 2;
        lock(hg, hair, Math.sin(a) * 0.115, HC + 0.1 + (i % 3) * 0.025, Math.cos(a) * 0.1 - 0.02, 0.95, 0.95, 0.95);
      }
      lock(hg, hair, 0, HC + 0.16, -0.01, 1.2, 1.0, 1.1);
      break;
    case 4: // Pagri
      hg.sphere(0.17, top, { pos: [0, HC + 0.07, -0.015], scale: [1.08, 0.88, 1.14] }, 22);
      hg.torus(0.158, 0.024, darker(top, 0.82), { pos: [0, HC + 0.055, 0], rot: [Math.PI / 2 - 0.1, 0, 0] });
      hg.torus(0.148, 0.02, darker(top, 1.05), { pos: [0, HC + 0.105, 0], rot: [Math.PI / 2 + 0.12, 0, 0] });
      hg.sphere(0.06, top, { pos: [0, HC + 0.205, 0.01] }, 14);
      break;
    case 5: // Cap
      scalp(hg, top, 0.46, -0.16);
      hg.roundBox(0.175, 0.014, 0.135, top, { pos: [0, HC + 0.055, 0.135], rot: [0.08, 0, 0] }, 0.006, 2);
      lock(hg, hair, 0.1, HC - 0.02, -0.07, 0.65, 1.2, 0.85);
      lock(hg, hair, -0.1, HC - 0.02, -0.07, 0.65, 1.2, 0.85);
      break;
    case 6: // Bald
      break;
    case 7: // Ponytail — swoop back
      scalp(hg, hair, 0.5);
      for (let i = 0; i < 5; i += 1) {
        lock(hg, hair, (i - 2) * 0.035, HC + 0.1, -0.04 - i * 0.01, 0.7, 0.8, 0.9, [-0.2, 0, 0]);
      }
      hg.capsule(0.04, 0.24, hair, { pos: [0, HC - 0.04, -0.15], rot: [0.35, 0, 0] }, 5, 10);
      break;
    case 8: // Fade / swoop up — soft clay mounds
      scalp(hg, hair, 0.4, -0.26);
      lock(hg, hair, 0, HC + 0.135, -0.015, 1.25, 0.7, 1.1);
      lock(hg, shade, 0.055, HC + 0.12, 0.015, 0.85, 0.75, 0.8, [0.15, 0.25, 0.1]);
      lock(hg, shade, -0.055, HC + 0.12, 0.015, 0.85, 0.75, 0.8, [0.15, -0.25, -0.1]);
      lock(hg, hair, 0.075, HC + 0.07, -0.05, 0.75, 0.95, 0.8);
      lock(hg, hair, -0.075, HC + 0.07, -0.05, 0.75, 0.95, 0.8);
      lock(hg, hair, 0, HC + 0.08, -0.09, 1.0, 0.7, 0.85);
      break;
    case 9: // Hijab
      hg.sphere(0.162, top, { pos: [0, HC + 0.02, -0.01], scale: [1.14, 1.22, 1.18] }, 22);
      hg.sphere(0.12, top, { pos: [0, HC - 0.1, -0.055], scale: [1.32, 1.45, 0.92] }, 16);
      hg.roundBox(0.22, 0.055, 0.028, darker(top, 0.9), { pos: [0, HC + 0.01, 0.125] }, 0.01, 2);
      break;
    default:
      scalp(hg, hair);
  }
}
