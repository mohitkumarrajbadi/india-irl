/** Shared constants — open package, safe to fork. */

export const TICK_HZ = 60;
export const TICK_DT = 1 / TICK_HZ;
export const NET_POSE_HZ = 15;

/** Matches existing client VK. */
export const VK = { none: 0, auto: 1, bike: 2, cab: 3 } as const;
export type VehicleKind = (typeof VK)[keyof typeof VK];

export const ACTION = {
  none: 0,
  wave: 1,
  dance: 2,
  sit: 3,
  point: 4,
  namaste: 5,
  punch: 6,
  kick: 7,
} as const;

export type ActionId = (typeof ACTION)[keyof typeof ACTION];

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };
