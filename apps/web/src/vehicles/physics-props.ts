/**
 * Per-class physical properties for arcade + Rapier drive.
 * Masses stay aligned with mass.ts / engine vehicle-tuning.
 */
import type { TrafficKind } from "./traffic-kinds.ts";

export type PhysicsProps = {
  mass: number;
  /** Metres — length / width / height. */
  length: number;
  width: number;
  height: number;
  /** Local Y of CoM (lower = more stable). */
  comY: number;
  /** Suspension spring scale (1 = baseline). */
  suspension: number;
  /** Tire grip 0.4…1.4 — mud/wet can scale this later. */
  grip: number;
  accelForce: number;
  brakeForce: number;
  maxSpeed: number;
  /** Structural HP pool before handling collapses. */
  durability: number;
  /** 0 soft / crumples … 1 rigid — affects bounce vs scrub. */
  rigidity: number;
  /** Angular inertia proxy — higher resists spin. */
  yawInertia: number;
  /** Rider separates from chassis on hard hits (bike/scooter). */
  separableRider: boolean;
};

/** Player drive kinds: 1 auto, 2 bike, 3 cab. */
export const PLAYER_PHYSICS: Record<1 | 2 | 3, PhysicsProps> = {
  1: {
    mass: 420,
    length: 2.6,
    width: 1.35,
    height: 1.7,
    comY: 0.55,
    suspension: 0.85,
    grip: 0.92,
    accelForce: 6.5,
    brakeForce: 15,
    maxSpeed: 15.5,
    durability: 85,
    rigidity: 0.45,
    yawInertia: 0.7,
    separableRider: false,
  },
  2: {
    mass: 140,
    length: 1.9,
    width: 0.7,
    height: 1.15,
    comY: 0.42,
    suspension: 0.55,
    grip: 1.05,
    accelForce: 8.5,
    brakeForce: 16,
    maxSpeed: 21,
    durability: 45,
    rigidity: 0.25,
    yawInertia: 0.28,
    separableRider: true,
  },
  3: {
    mass: 1200,
    length: 4.1,
    width: 1.75,
    height: 1.45,
    comY: 0.48,
    suspension: 1.05,
    grip: 1.0,
    accelForce: 7.5,
    brakeForce: 18,
    maxSpeed: 27,
    durability: 140,
    rigidity: 0.72,
    yawInertia: 1.15,
    separableRider: false,
  },
};

/** NPC traffic — mirrors KIND_INFO fleet (12 types). */
export const TRAFFIC_PHYSICS: Record<TrafficKind, PhysicsProps> = {
  0: { ...PLAYER_PHYSICS[1] },
  1: { ...PLAYER_PHYSICS[2] },
  2: { ...PLAYER_PHYSICS[3] },
  3: {
    mass: 9000,
    length: 10.2,
    width: 2.5,
    height: 3.1,
    comY: 0.95,
    suspension: 1.35,
    grip: 0.88,
    accelForce: 2.6,
    brakeForce: 9,
    maxSpeed: 10.5,
    durability: 400,
    rigidity: 0.9,
    yawInertia: 3.2,
    separableRider: false,
  },
  4: {
    mass: 7000,
    length: 8.4,
    width: 2.5,
    height: 3.0,
    comY: 0.9,
    suspension: 1.4,
    grip: 0.85,
    accelForce: 2.2,
    brakeForce: 8,
    maxSpeed: 9.5,
    durability: 360,
    rigidity: 0.88,
    yawInertia: 2.8,
    separableRider: false,
  },
  5: {
    ...PLAYER_PHYSICS[2],
    mass: 160,
    length: 2.05,
    maxSpeed: 24,
    accelForce: 9.2,
    separableRider: true,
  },
  6: {
    ...PLAYER_PHYSICS[3],
    mass: 1650,
    length: 4.6,
    width: 1.9,
    height: 1.75,
    maxSpeed: 24,
    durability: 170,
  },
  7: {
    mass: 2200,
    length: 4.8,
    width: 1.85,
    height: 2.1,
    comY: 0.7,
    suspension: 1.15,
    grip: 0.9,
    accelForce: 3.4,
    brakeForce: 11,
    maxSpeed: 14,
    durability: 200,
    rigidity: 0.8,
    yawInertia: 1.6,
    separableRider: false,
  },
  8: {
    ...PLAYER_PHYSICS[3],
    mass: 1800,
    length: 4.9,
    width: 1.95,
    height: 2.0,
    maxSpeed: 22,
    durability: 160,
  },
  9: {
    ...PLAYER_PHYSICS[3],
    mass: 1400,
    length: 4.0,
    width: 1.8,
    height: 1.7,
    maxSpeed: 23,
    durability: 150,
  },
  10: { ...PLAYER_PHYSICS[3], maxSpeed: 26, durability: 145 },
  11: {
    ...PLAYER_PHYSICS[1],
    mass: 380,
    length: 2.7,
    maxSpeed: 12,
    accelForce: 4.2,
  },
};
