export type ActorFrame = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  /** 0 on foot, 1..3 vehicle kind. */
  vehicle: number;
  seat: number;
  emote: number;
  emoteT: number;
  /** Riding in someone else's vehicle: x/z are already the seat position. */
  passenger: boolean;
  roll: number;
  /** Ground height, used for the jump arc. */
  y: number;
  /** Turn indicators: -1 left, 0 off, 1 right. */
  blinker?: -1 | 0 | 1;
  /** 0 wrecked … 1 pristine — drives paint scuff / crumple. */
  chassisHealth?: number;
};
