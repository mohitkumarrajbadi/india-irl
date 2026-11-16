/** Traffic agent kinds + shared agent shape. */

/**
 * Street fleet (12 types):
 * 0 auto · 1 scooter · 2 hatch · 3 bus · 4 truck · 5 motorcycle ·
 * 6 SUV · 7 tempo · 8 van · 9 jeep · 10 taxi · 11 e-rickshaw
 */
export type TrafficKind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const TRAFFIC_KIND_COUNT = 12;

export const TRAFFIC_NAMES: Record<TrafficKind, string> = {
  0: "Auto-rickshaw",
  1: "Scooter",
  2: "Hatchback",
  3: "Bus",
  4: "Truck",
  5: "Motorcycle",
  6: "SUV",
  7: "Tempo",
  8: "Van",
  9: "Jeep",
  10: "Taxi",
  11: "E-rickshaw",
};

type KindInfo = { len: number; wid: number; top: number; accel: number; brake: number; turn: number };

export const KIND_INFO: Record<TrafficKind, KindInfo> = {
  0: { len: 2.6, wid: 1.4, top: 11, accel: 4.5, brake: 12, turn: 4.2 },
  1: { len: 1.9, wid: 0.7, top: 14, accel: 6, brake: 13, turn: 3.6 },
  2: { len: 4.1, wid: 1.75, top: 15, accel: 4.8, brake: 14, turn: 5.2 },
  3: { len: 10.2, wid: 2.5, top: 10.5, accel: 2.6, brake: 9, turn: 8.5 },
  4: { len: 8.4, wid: 2.5, top: 9.5, accel: 2.2, brake: 8, turn: 8 },
  5: { len: 2.05, wid: 0.72, top: 16, accel: 7.2, brake: 14, turn: 3.2 },
  6: { len: 4.6, wid: 1.9, top: 14, accel: 4.2, brake: 13, turn: 5.8 },
  7: { len: 4.8, wid: 1.85, top: 11, accel: 3.4, brake: 11, turn: 6.2 },
  8: { len: 4.9, wid: 1.95, top: 13, accel: 3.8, brake: 12, turn: 6.0 },
  9: { len: 4.0, wid: 1.8, top: 13.5, accel: 4.4, brake: 13, turn: 5.5 },
  10: { len: 4.2, wid: 1.75, top: 15.5, accel: 5.0, brake: 14, turn: 5.0 },
  11: { len: 2.7, wid: 1.35, top: 10, accel: 3.8, brake: 11, turn: 4.0 },
};

/** Scooter / motorcycle — pillion + side-fall wreck. */
export function isTwoWheeler(kind: TrafficKind): boolean {
  return kind === 1 || kind === 5;
}

/** Bus / truck / tempo — slow lane changes, heavy tumble. */
export function isHeavyTraffic(kind: TrafficKind): boolean {
  return kind === 3 || kind === 4 || kind === 7;
}

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
  /** Player currently driving — hide instance (actor mesh owns it). */
  taken: boolean;
  /**
   * Rider ejected / chassis left in world — visible, enterable, AI frozen.
   * Distinct from `taken` so the bike does not sink to y=-80.
   */
  wrecked: boolean;
  /** Scooter/bike rear passenger — random like GTA ambient traffic. */
  hasPillion: boolean;
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
  /** Exit lane index chosen at junction (applied when stage → 1). */
  exitLane: number;
  /** Fade-in seconds remaining after respawn (0 = fully visible). */
  appearT: number;
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
