/** Traffic agent kinds + shared agent shape. */

/** 0 auto, 1 bike, 2 car, 3 bus, 4 truck. */
export type TrafficKind = 0 | 1 | 2 | 3 | 4;

type KindInfo = { len: number; wid: number; top: number; accel: number; brake: number; turn: number };

export const KIND_INFO: Record<TrafficKind, KindInfo> = {
  0: { len: 2.6, wid: 1.4, top: 11, accel: 4.5, brake: 12, turn: 4.2 },
  1: { len: 1.9, wid: 0.7, top: 14, accel: 6, brake: 13, turn: 3.6 },
  2: { len: 4.1, wid: 1.75, top: 15, accel: 4.8, brake: 14, turn: 5.2 },
  3: { len: 10.2, wid: 2.5, top: 10.5, accel: 2.6, brake: 9, turn: 8.5 },
  4: { len: 8.4, wid: 2.5, top: 9.5, accel: 2.2, brake: 8, turn: 8 },
};

export type Agent = {
  kind: TrafficKind;
  tint: number;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  /** Current target and the pending exit waypoint. */
  tx: number;
  tz: number;
  t2x: number;
  t2z: number;
  stage: 0 | 1;
  ni: number;
  nj: number;
  /** Direction index of travel (0 +Z, 1 +X, 2 -Z, 3 -X). */
  dir: number;
  lane: number;
  top: number;
  stuck: number;
  ghost: number;
  /** Knockback while tumbling after a smash. */
  kbX: number;
  kbZ: number;
  spin: number;
  /** Player took this vehicle — hide + skip AI until released. */
  taken: boolean;
  /** Display blinker (−1 left / 0 off / 1 right). */
  blinker: -1 | 0 | 1;
  /** Junction turn intent — restored after overtake blinkers. */
  turnBlinker: -1 | 0 | 1;
  /** True while decelerating for lights UI. */
  braking: boolean;
  /** Seconds remaining on an active lane-change strafe. */
  laneTimer: number;
  /** Local +X strafe during lane change (−1…1). */
  laneStrafe: number;
  /** Approach dir before junction plan (for signal cancel). */
  approachDir: number;
};

export type Obstacle = { x: number; z: number; r: number };

export const DX = [0, 1, 0, -1];
export const DZ = [1, 0, -1, 0];

/** Relative turn from dir A → B: 0 straight, 1 right, 3 left, 2 u-turn. */
export function turnBetween(fromDir: number, toDir: number): 0 | 1 | 2 | 3 {
  return (((toDir - fromDir) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
}

export function blinkerForTurn(turn: 0 | 1 | 2 | 3): -1 | 0 | 1 {
  if (turn === 1) return 1;
  if (turn === 3) return -1;
  if (turn === 2) return -1; // u-turn → left
  return 0;
}
