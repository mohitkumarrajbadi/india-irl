/**
 * Memoji-style head: soft SDF clay skull + painted facial features.
 * Eyes are separate glossy meshes (see eyes.ts).
 */
import type { GeoBuilder } from "../gfx/geo";
import { bakeSdf } from "../gfx/sdf/bake";
import { sculpt } from "../gfx/sdf/nets";
import type { SdfScene } from "../gfx/sdf/scene";
import { darker, warmSkin, EAR, FACE_Z, HC, SKULL } from "./parts";

/** Slot 0 skin · 1 blush · 2 unused · 3 lip · 4 nose warm */
const HEAD_CELL = 0.009;

function sculptHead(s: SdfScene): void {
  // Soft rounded skull — single primary mass, no stacked forehead/jaw bulges
  s.ellipsoid([SKULL.rx, SKULL.ry, SKULL.rz], {
    pos: [0, HC + 0.006, -0.004],
    k: 0.03,
    slot: 0,
  });
  // Gentle lower-face taper (chin) — small, blended, not a second jowl mass
  s.ellipsoid([0.078, 0.055, 0.07], {
    pos: [0, HC - 0.078, 0.018],
    k: 0.028,
    slot: 0,
  });
  s.ball(0.022, { pos: [0, HC - 0.112, 0.042], k: 0.016, slot: 0 });

  // Cheek colour only — tint, never additive volume (avoids face bulges)
  s.tint([0.038, 0.03, 0.028], 1, 0.022, {
    pos: [0.062, HC - 0.022, FACE_Z - 0.04],
    sym: true,
  }, 0.85);

  // Ears — soft C-shell volumes
  s.ellipsoid([0.015, 0.04, 0.025], { pos: [EAR.x, EAR.y, EAR.z], k: 0.014, slot: 0, sym: true });
  s.ellipsoid([0.006, 0.016, 0.011], {
    pos: [EAR.x - 0.011, EAR.y, EAR.z + 0.005],
    k: 0.01,
    slot: 0,
    sym: true,
  });
  s.tint([0.01, 0.01, 0.008], 1, 0.01, {
    pos: [EAR.x, EAR.y + 0.02, EAR.z],
    sym: true,
  }, 0.6);

  // Soft bulb nose
  s.ball(0.015, { pos: [0, HC - 0.006, FACE_Z + 0.002], k: 0.011, slot: 4 });
  s.ellipsoid([0.0055, 0.011, 0.0045], {
    pos: [0, HC + 0.014, FACE_Z - 0.012],
    k: 0.009,
    slot: 4,
  });

  // Smile as tint + tiny lip volume (kept minimal so chin stays clean)
  s.ellipsoid([0.03, 0.003, 0.004], {
    pos: [0, HC - 0.066, FACE_Z - 0.006],
    k: 0.005,
    slot: 3,
  });
}

/** Soft clay skull + face as one watertight Memoji head. */
export function buildSkull(hg: GeoBuilder, skin: string): void {
  const mesh = sculpt("memoji-head-v3", HEAD_CELL, sculptHead);
  const blush = warmSkin(skin);
  const nose = warmSkin(skin);
  hg.absorb(bakeSdf(mesh, [skin, blush, skin, darker(skin, 0.55), nose]));
}

/**
 * Accent features: Memoji slug brows + soft smile, tinted from hair / skin.
 * Brows live only here (not in the SDF) so they never double-stack.
 */
export function buildFace(hg: GeoBuilder, skin: string, hair: string): void {
  const brow = darker(hair, 0.55);
  const lip = darker(skin, 0.52);

  for (const sx of [1, -1] as const) {
    // Soft Memoji slug brow — single flattened volume + inner pad
    hg.sphere(0.015, brow, {
      pos: [sx * 0.036, HC + 0.058, FACE_Z + 0.006],
      scale: [1.65, 0.42, 0.48],
      rot: [0.12, 0, sx * -0.18],
    }, 12);
    hg.sphere(0.0075, brow, {
      pos: [sx * 0.017, HC + 0.056, FACE_Z + 0.008],
      scale: [1.15, 0.42, 0.42],
    }, 8);
  }

  hg.sphere(0.016, lip, { pos: [0, HC - 0.066, FACE_Z - 0.006], scale: [1.45, 0.12, 0.16] }, 12);
  hg.sphere(0.007, lip, {
    pos: [0.018, HC - 0.062, FACE_Z - 0.004],
    scale: [0.6, 0.18, 0.18],
    rot: [0, 0, 0.5],
  }, 8);
  hg.sphere(0.007, lip, {
    pos: [-0.018, HC - 0.062, FACE_Z - 0.004],
    scale: [0.6, 0.18, 0.18],
    rot: [0, 0, -0.5],
  }, 8);
}
