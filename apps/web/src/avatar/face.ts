/**
 * Memoji-style head: soft SDF clay skull + painted facial features.
 * Eyes are separate glossy meshes (see eyes.ts).
 */
import type { GeoBuilder } from "../gfx/geo";
import { bakeSdf } from "../gfx/sdf/bake";
import { sculpt } from "../gfx/sdf/nets";
import type { SdfScene } from "../gfx/sdf/scene";
import { darker, warmSkin, EAR, FACE_Z, HC, SKULL } from "./parts";

/** Slot 0 skin · 1 blush · 2 brow · 3 lip · 4 nose warm */
const HEAD_CELL = 0.009;

function sculptHead(s: SdfScene): void {
  const k = 0.022;
  // Soft rounded skull — slightly boxy Memoji silhouette via ellipsoid ratios
  s.ellipsoid([SKULL.rx * 1.02, SKULL.ry, SKULL.rz], {
    pos: [0, HC + 0.008, -0.006],
    k: 0.028,
    slot: 0,
  });
  // Forehead fill
  s.ellipsoid([0.115, 0.06, 0.085], { pos: [0, HC + 0.055, 0.02], k, slot: 0 });
  // Continuous jaw / chin mass
  s.ellipsoid([0.1, 0.074, 0.086], { pos: [0, HC - 0.07, 0.025], k, slot: 0 });
  s.ellipsoid([0.034, 0.024, 0.028], { pos: [0, HC - 0.118, 0.055], k: 0.014, slot: 0 });
  // Cheek flush discs
  s.ellipsoid([0.03, 0.024, 0.01], {
    pos: [0.068, HC - 0.028, FACE_Z - 0.028],
    k: 0.018,
    slot: 1,
    sym: true,
  });
  // Ears — soft C-shell volumes
  s.ellipsoid([0.016, 0.044, 0.027], { pos: [EAR.x, EAR.y, EAR.z], k: 0.014, slot: 0, sym: true });
  s.ellipsoid([0.007, 0.018, 0.012], {
    pos: [EAR.x - 0.012, EAR.y, EAR.z + 0.006],
    k: 0.01,
    slot: 0,
    sym: true,
  });
  s.ellipsoid([0.006, 0.007, 0.005], {
    pos: [EAR.x, EAR.y + 0.022, EAR.z],
    k: 0.008,
    slot: 1,
    sym: true,
  });

  // Soft bulb nose
  s.ball(0.017, { pos: [0, HC - 0.008, FACE_Z + 0.004], k: 0.012, slot: 4 });
  s.ellipsoid([0.006, 0.012, 0.005], {
    pos: [0, HC + 0.012, FACE_Z - 0.01],
    k: 0.01,
    slot: 4,
  });

  // Thick clay brows — rounded “slug” volumes
  s.cone(
    [0.022, HC + 0.07, FACE_Z - 0.018],
    [0.058, HC + 0.076, FACE_Z - 0.022],
    0.011,
    0.009,
    { k: 0.008, slot: 2, sym: true },
  );

  // Simple closed smile
  s.ellipsoid([0.034, 0.0035, 0.005], {
    pos: [0, HC - 0.068, FACE_Z - 0.004],
    k: 0.006,
    slot: 3,
  });
  s.ellipsoid([0.008, 0.003, 0.004], {
    pos: [0.024, HC - 0.064, FACE_Z - 0.002],
    rot: [0, 0, 0.5],
    k: 0.005,
    slot: 3,
    sym: true,
  });
}

/** Soft clay skull + face as one watertight Memoji head. */
export function buildSkull(hg: GeoBuilder, skin: string): void {
  const mesh = sculpt("memoji-head-v2", HEAD_CELL, sculptHead);
  const blush = warmSkin(skin);
  const nose = warmSkin(skin);
  // Temporary brow/lip — overwritten when buildFace paints accents on top
  hg.absorb(bakeSdf(mesh, [skin, blush, darker(skin, 0.35), darker(skin, 0.55), nose]));
}

/**
 * Accent features layered for look-dependent brow/lip colour.
 * Skull already carries a soft base; this reinforces brows + smile with hair tint.
 */
export function buildFace(hg: GeoBuilder, skin: string, hair: string): void {
  const brow = darker(hair, 0.4);
  const lip = darker(skin, 0.52);

  for (const sx of [1, -1] as const) {
    hg.capsule(0.01, 0.038, brow, {
      pos: [sx * 0.042, HC + 0.072, FACE_Z - 0.018],
      rot: [0.12, 0, sx * -0.52],
    }, 5, 10);
  }

  hg.sphere(0.02, lip, { pos: [0, HC - 0.068, FACE_Z - 0.002], scale: [1.55, 0.14, 0.2] }, 12);
  hg.sphere(0.009, lip, {
    pos: [0.022, HC - 0.064, FACE_Z],
    scale: [0.7, 0.22, 0.22],
    rot: [0, 0, 0.55],
  }, 8);
  hg.sphere(0.009, lip, {
    pos: [-0.022, HC - 0.064, FACE_Z],
    scale: [0.7, 0.22, 0.22],
    rot: [0, 0, -0.55],
  }, 8);
}
