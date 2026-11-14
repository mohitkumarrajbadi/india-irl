/** Head accessories — glasses, headphones, AirPods, bindi, beard, hoops. */
import type { GeoBuilder } from "../gfx/geo";
import { darker, EAR, FACE_Z, HC, SKULL } from "./parts";
import * as THREE from "three";

const HP = "#1a1a1c";
const HP_METAL = "#3a3a40";
const AIR = "#f2f2f4";
const AIR_STEM = "#e8e8ec";

/** Over-ear cans seated on ear landmarks + arched headband. */
export function buildHeadphones(hg: GeoBuilder): void {
  // Headband: ear → crown → ear (strut chain)
  let prev: [number, number, number] | null = null;
  for (let i = 0; i <= 10; i += 1) {
    const a = Math.PI * (i / 10);
    const x = Math.cos(a) * EAR.x;
    const y = HC + 0.01 + Math.sin(a) * (SKULL.ry * 1.08);
    const z = EAR.z - 0.005;
    const pt: [number, number, number] = [x, y, z];
    if (prev) hg.strut(prev, pt, 0.011, HP);
    prev = pt;
  }
  for (const sx of [1, -1] as const) {
    hg.cyl(0.048, 0.052, 0.03, HP, { pos: [sx * EAR.x, EAR.y, EAR.z], rot: [0, 0, Math.PI / 2] }, 14);
    hg.cyl(0.04, 0.036, 0.01, darker(HP, 1.4), {
      pos: [sx * (EAR.x - sx * 0.018), EAR.y, EAR.z],
      rot: [0, 0, Math.PI / 2],
    }, 12);
    hg.cyl(0.02, 0.02, 0.005, HP_METAL, {
      pos: [sx * (EAR.x + sx * 0.016), EAR.y, EAR.z],
      rot: [0, 0, Math.PI / 2],
    }, 10);
  }
}

/** In-ear stems seated in the outer ear bowl. */
export function buildAirPods(hg: GeoBuilder): void {
  for (const sx of [1, -1] as const) {
    const x = sx * (EAR.x - 0.01);
    const y = EAR.y - 0.002;
    const z = EAR.z + 0.012;
    hg.sphere(0.013, AIR, { pos: [x, y, z], scale: [0.9, 1.05, 0.95] }, 10);
    hg.cyl(0.005, 0.006, 0.036, AIR_STEM, {
      pos: [x, y - 0.026, z + 0.004],
      rot: [0.18, 0, sx * 0.06],
    }, 8);
    hg.sphere(0.0075, darker(AIR, 0.9), {
      pos: [x - sx * 0.006, y + 0.002, z - 0.005],
      scale: [0.7, 0.85, 0.7],
    }, 6);
  }
}

export function buildGlasses(hg: GeoBuilder): void {
  const y = HC + 0.024;
  const z = FACE_Z + 0.012;
  const rim = "#1a1a1c";
  for (const sx of [1, -1] as const) {
    // Thick frames that clear glossy eyes
    hg.torus(0.034, 0.0045, rim, { pos: [sx * 0.04, y, z] });
    hg.strut([sx * 0.07, y + 0.004, z], [sx * EAR.x * 0.95, EAR.y + 0.012, EAR.z + 0.008], 0.004, rim);
  }
  hg.box(0.022, 0.004, 0.004, rim, { pos: [0, y + 0.004, z] });
}

export function buildBindi(hg: GeoBuilder): void {
  hg.sphere(0.0075, "#c1121f", { pos: [0, HC + 0.068, FACE_Z + 0.002] }, 8);
}

export function buildBeard(hg: GeoBuilder, hair: string): void {
  hg.add(
    new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.4),
    hair,
    { pos: [0, HC - 0.025, 0.012], scale: [0.9, 1.02, 0.96] },
  );
}

export function buildHoops(hg: GeoBuilder): void {
  for (const sx of [1, -1] as const) {
    hg.torus(0.015, 0.0032, "#e2b64a", {
      pos: [sx * EAR.x, EAR.y - 0.03, EAR.z + 0.01],
      rot: [0.25, 0, Math.PI / 2],
    });
  }
}
