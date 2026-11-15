/** Shared Memoji-style proportions — accessories snap to these landmarks. */
export const HEAD_SCALE = 1.22;
/** Hip joint height in body space — shoe soles sit on y≈0. */
export const HIP_Y = 0.82;
export const SEAT_HIP_OFFSET = 0.68;

/** Head-local landmarks (before HEAD_SCALE). Soft rounded “clay” skull. */
export const HC = 0.15;
export const SKULL = { rx: 0.138, ry: 0.158, rz: 0.128 } as const;
/** Outer ear tip — cups / AirPods / hoops attach here. */
export const EAR = { x: 0.138, y: HC + 0.0, z: -0.008 } as const;
/** Front of face plane for features. */
export const FACE_Z = 0.122;
/** Eye centers (glossy black ovals). */
export const EYE = { x: 0.036, y: HC + 0.024, z: FACE_Z + 0.01 } as const;

export const BODY_W = [0.86, 0.96, 1.12] as const;
export const BODY_H = [1.02, 1, 0.98] as const;
/** 0–16 classic joints · 17–20 arm/elbow Y (palm twist for namaste / wave). */
export const JOINT_COUNT = 21;

export function darker(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function warmSkin(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * 0.72 + 240 * 0.28));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * 0.72 + 150 * 0.28));
  const b = Math.min(255, Math.round((n & 255) * 0.72 + 140 * 0.28));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
