/** Emote joint overrides layered on walk/seat targets. */

const J = {
  lArmX: 0, lArmZ: 1, rArmX: 2, rArmZ: 3, lElbX: 4, lElbZ: 5, rElbX: 6, rElbZ: 7,
  lLegX: 8, rLegX: 9, lKneeX: 10, rKneeX: 11, headX: 12, headY: 13, bodyY: 14, bodyRY: 15, bodyRX: 16,
} as const;

export function poseEmote(T: Float32Array, emote: number, t: number, full: boolean): void {
  if (emote === 1) {
    T[J.rArmX] = 0;
    T[J.rArmZ] = -2.6;
    T[J.rElbZ] = -0.3 + Math.sin(t * 9) * 0.55;
    T[J.rElbX] = 0;
  } else if (emote === 2) {
    T[J.lArmX] = T[J.rArmX] = -0.55;
    T[J.lArmZ] = -0.42;
    T[J.rArmZ] = 0.42;
    T[J.lElbX] = T[J.rElbX] = -2.05;
    if (full) T[J.headX] = 0.28;
  } else if (emote === 3 && full) {
    const w = Math.sin(t * 8.5);
    T[J.bodyY] = Math.abs(w) * 0.16;
    T[J.bodyRY] = Math.sin(t * 4.2) * 0.32;
    T[J.rArmX] = T[J.lArmX] = -0.1;
    T[J.rArmZ] = -2.4 + w * 0.55;
    T[J.lArmZ] = 2.4 - w * 0.55;
    T[J.rElbX] = T[J.lElbX] = -0.15;
    T[J.lLegX] = -Math.max(0, w) * 0.7;
    T[J.rLegX] = -Math.max(0, -w) * 0.7;
    T[J.lKneeX] = Math.max(0, w) * 1.1;
    T[J.rKneeX] = Math.max(0, -w) * 1.1;
    T[J.headY] = Math.sin(t * 4.2) * 0.3;
  } else if (emote === 4) {
    if (full) {
      const sip = 0.5 + 0.5 * Math.sin(t * 1.5);
      T[J.rArmX] = -0.7 - sip * 0.35;
      T[J.rArmZ] = 0.2;
      T[J.rElbX] = -1.75 - sip * 0.25;
      T[J.lArmX] = -0.3;
      T[J.lElbX] = -1.0;
      T[J.headX] = -0.12 * sip;
    } else {
      T[J.rArmX] = -0.8;
      T[J.rElbX] = -1.9;
    }
  } else if (emote === 5 && full) {
    const jab = Math.min(1, t * 14);
    const retract = t > 0.18 ? Math.min(1, (t - 0.18) * 6) : 0;
    const punch = jab * (1 - retract * 0.85);
    T[J.rArmX] = -0.35 - punch * 1.15;
    T[J.rArmZ] = -0.15 + punch * 0.35;
    T[J.rElbX] = -0.2 - punch * 0.55;
    T[J.lArmX] = -0.55;
    T[J.lElbX] = -1.1;
    T[J.bodyRY] = punch * 0.35;
    T[J.bodyRX] = punch * 0.12;
    T[J.lLegX] = punch * 0.25;
    T[J.rLegX] = -punch * 0.15;
  } else if (emote === 6 && full) {
    const kick = Math.min(1, t * 10);
    const settle = t > 0.22 ? Math.min(1, (t - 0.22) * 5) : 0;
    const k = kick * (1 - settle * 0.7);
    T[J.rLegX] = -k * 1.55;
    T[J.rKneeX] = 0.2 + k * 0.35;
    T[J.lLegX] = k * 0.2;
    T[J.lKneeX] = 0.15;
    T[J.rArmX] = -0.4;
    T[J.lArmX] = -0.55;
    T[J.bodyRX] = -k * 0.18;
    T[J.bodyRY] = -k * 0.2;
    T[J.headX] = k * 0.1;
  }
}
