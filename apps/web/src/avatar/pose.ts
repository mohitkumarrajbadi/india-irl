/** Joint targets + easing for walk / seat / emotes. */
import type { Rig } from "./rig";
import { JOINT_COUNT } from "./parts";
import { poseEmote } from "./pose-emote";

export const EMOTES = [
  { id: 0, name: "None", key: "" },
  { id: 1, name: "Wave", key: "Z" },
  { id: 2, name: "Namaste", key: "X" },
  { id: 3, name: "Bhangra", key: "C" },
  { id: 4, name: "Chai break", key: "V" },
  { id: 5, name: "Punch", key: "R" },
  { id: 6, name: "Kick", key: "G" },
  { id: 7, name: "Garba", key: "B" },
  { id: 8, name: "Groove", key: "Y" },
  { id: 9, name: "Bollywood", key: "U" },
] as const;

/** Combat emotes keep playing briefly while you move; dances cancel. */
export function isCombatEmote(id: number): boolean {
  return id === 5 || id === 6;
}

/** Foot-only vibe dances (need room to move). */
export function isDanceEmote(id: number): boolean {
  return id === 3 || id === 7 || id === 8 || id === 9;
}

export const SEAT = { stand: 0, steer: 1, relaxed: 2, rider: 3, pillion: 4 } as const;

const J = {
  lArmX: 0, lArmZ: 1, rArmX: 2, rArmZ: 3, lElbX: 4, lElbZ: 5, rElbX: 6, rElbZ: 7,
  lLegX: 8, rLegX: 9, lKneeX: 10, rKneeX: 11, headX: 12, headY: 13, bodyY: 14, bodyRY: 15, bodyRX: 16,
  lArmY: 17, rArmY: 18, lElbY: 19, rElbY: 20,
} as const;

const target = new Float32Array(JOINT_COUNT);

export type Pose = {
  phase: number;
  speed: number;
  emote: number;
  emoteT: number;
  seat: number;
  time: number;
  lean?: number;
};

export function poseRig(rig: Rig, p: Pose, dt: number): void {
  target.fill(0);
  const T = target;
  const t = p.emoteT;
  if (p.seat === SEAT.stand) poseStand(T, p, t);
  else poseSeated(T, p, t);

  // Combat snaps harder so punch/kick read at full intensity
  const snap = p.emote === 5 || p.emote === 6;
  const k = Math.min(1, dt * (snap ? 28 : 14));
  const c = rig.cur;
  for (let i = 0; i < JOINT_COUNT; i += 1) c[i] += (T[i] - c[i]) * k;

  rig.lArm.rotation.set(c[J.lArmX], c[J.lArmY], c[J.lArmZ]);
  rig.rArm.rotation.set(c[J.rArmX], c[J.rArmY], c[J.rArmZ]);
  rig.lElbow.rotation.set(c[J.lElbX], c[J.lElbY], c[J.lElbZ]);
  rig.rElbow.rotation.set(c[J.rElbX], c[J.rElbY], c[J.rElbZ]);
  rig.lLeg.rotation.x = c[J.lLegX];
  rig.rLeg.rotation.x = c[J.rLegX];
  rig.lKnee.rotation.x = c[J.lKneeX];
  rig.rKnee.rotation.x = c[J.rKneeX];
  rig.head.rotation.set(c[J.headX], c[J.headY], 0);
  rig.body.position.y = c[J.bodyY];
  rig.body.rotation.set(c[J.bodyRX], c[J.bodyRY], 0);
  rig.cup.visible = p.emote === 4;
}

function poseStand(T: Float32Array, p: Pose, t: number): void {
  const pace = Math.min(p.speed / 4.2, 1.7);
  const idle = pace < 0.08;
  const breath = Math.sin(p.time * 1.7) * 0.012;
  const s = Math.sin(p.phase);
  const swing = s * 0.78 * pace;
  T[J.lLegX] = -swing;
  T[J.rLegX] = swing;
  T[J.lKneeX] = Math.max(0, Math.cos(p.phase)) * 1.05 * pace + 0.04;
  T[J.rKneeX] = Math.max(0, -Math.cos(p.phase)) * 1.05 * pace + 0.04;
  T[J.lArmX] = swing * 0.95;
  T[J.rArmX] = -swing * 0.95;
  T[J.lArmZ] = idle ? 0.1 + Math.sin(p.time * 0.9) * 0.02 : 0.08;
  T[J.rArmZ] = idle ? -0.1 - Math.sin(p.time * 0.9 + 1) * 0.02 : -0.08;
  // Natural hang — slight shoulder twist so palms face thighs
  T[J.lArmY] = idle ? 0.2 : 0.12;
  T[J.rArmY] = idle ? -0.2 : -0.12;
  T[J.lElbX] = -0.28 - 0.55 * pace;
  T[J.rElbX] = -0.28 - 0.55 * pace;
  T[J.lElbY] = 0;
  T[J.rElbY] = 0;
  T[J.bodyY] = Math.abs(s) * 0.05 * pace + breath + (idle ? Math.sin(p.time * 1.7) * 0.008 : 0);
  T[J.bodyRX] = Math.min(0.22, pace * 0.12);
  T[J.bodyRY] = -s * 0.12 * pace;
  T[J.headX] = -T[J.bodyRX] * 0.7 + (idle ? Math.sin(p.time * 0.55) * 0.03 : 0);
  T[J.headY] = idle ? Math.sin(p.time * 0.35) * 0.06 : 0;
  poseEmote(T, p.emote, t, true);
}

function poseSeated(T: Float32Array, p: Pose, t: number): void {
  const bike = p.seat >= SEAT.rider;
  T[J.lLegX] = T[J.rLegX] = bike ? -1.05 : -1.45;
  T[J.lKneeX] = T[J.rKneeX] = bike ? 1.15 : 1.5;
  T[J.bodyY] = bike ? -0.08 : -0.14;
  T[J.bodyRX] = p.seat === SEAT.rider ? 0.18 : 0;
  if (p.seat === SEAT.steer) {
    T[J.lArmX] = T[J.rArmX] = -0.95;
    T[J.lElbX] = T[J.rElbX] = -0.55;
    T[J.lArmZ] = -0.08;
    T[J.rArmZ] = 0.08;
    T[J.lArmY] = 0.35;
    T[J.rArmY] = -0.35;
    T[J.lElbY] = 0.4;
    T[J.rElbY] = -0.4;
    T[J.bodyRY] = (p.lean ?? 0) * 0.35;
  } else if (p.seat === SEAT.rider) {
    T[J.lArmX] = T[J.rArmX] = -1.15;
    T[J.lElbX] = T[J.rElbX] = -0.35;
    T[J.lArmZ] = -0.2;
    T[J.rArmZ] = 0.2;
    T[J.lArmY] = 0.25;
    T[J.rArmY] = -0.25;
  } else {
    T[J.lArmX] = T[J.rArmX] = -0.35;
    T[J.lElbX] = T[J.rElbX] = -0.9;
    T[J.lArmY] = 0.2;
    T[J.rArmY] = -0.2;
  }
  poseEmote(T, p.emote, t, false);
}
