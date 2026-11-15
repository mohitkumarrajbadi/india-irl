/** Emote joint overrides layered on walk/seat targets. */

const J = {
  lArmX: 0, lArmZ: 1, rArmX: 2, rArmZ: 3, lElbX: 4, lElbZ: 5, rElbX: 6, rElbZ: 7,
  lLegX: 8, rLegX: 9, lKneeX: 10, rKneeX: 11, headX: 12, headY: 13, bodyY: 14, bodyRY: 15, bodyRX: 16,
  lArmY: 17, rArmY: 18, lElbY: 19, rElbY: 20,
} as const;

export function poseEmote(T: Float32Array, emote: number, t: number, full: boolean): void {
  if (emote === 1) {
    // Wave — original raised-arm wobble (hand stays visible)
    T[J.rArmX] = 0;
    T[J.rArmZ] = -2.6;
    T[J.rArmY] = 0;
    T[J.rElbX] = 0;
    T[J.rElbY] = 0;
    T[J.rElbZ] = -0.3 + Math.sin(t * 9) * 0.55;
    if (full) T[J.headY] = -0.08;
  } else if (emote === 2) {
    // Namaste — prayer hands at mid-chest, palms face, slight gap so fingers don't merge
    T[J.lArmX] = T[J.rArmX] = -0.5;
    T[J.lArmZ] = -0.38;
    T[J.rArmZ] = 0.38;
    T[J.lArmY] = T[J.rArmY] = 0;
    T[J.lElbX] = T[J.rElbX] = -1.95;
    T[J.lElbZ] = 0.05;
    T[J.rElbZ] = -0.05;
    T[J.lElbY] = -1.05;
    T[J.rElbY] = 1.05;
    if (full) T[J.headX] = 0.28;
  } else if (emote === 3 && full) {
    // Bhangra — high-arm bounce
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
    // Chai break — cup-to-lips
    if (full) {
      const sip = 0.5 + 0.5 * Math.sin(t * 1.5);
      T[J.rArmX] = -0.7 - sip * 0.35;
      T[J.rArmZ] = 0.2;
      T[J.rElbX] = -1.75 - sip * 0.25;
      T[J.rElbY] = 0.55;
      T[J.lArmX] = -0.3;
      T[J.lElbX] = -1.0;
      T[J.headX] = -0.12 * sip;
    } else {
      T[J.rArmX] = -0.8;
      T[J.rElbX] = -1.9;
    }
  } else if (emote === 5 && full) {
    // Punch — wind-up → cross → recover (guard hand stays up)
    const wind = Math.min(1, t * 16);
    const strike = t > 0.07 ? Math.min(1, (t - 0.07) * 18) : 0;
    const recover = t > 0.2 ? Math.min(1, (t - 0.2) * 5.5) : 0;
    const load = wind * (1 - strike);
    const punch = strike * (1 - recover * 0.88);
    T[J.rArmX] = -0.25 - load * 0.55 - punch * 1.35;
    T[J.rArmZ] = 0.35 - load * 0.55 + punch * 0.55;
    T[J.rArmY] = -load * 0.35 + punch * 0.25;
    T[J.rElbX] = -1.35 + load * 0.55 - punch * 0.85;
    T[J.rElbY] = punch * 0.45;
    T[J.rElbZ] = -load * 0.2 + punch * 0.15;
    // Guard / chamber left
    T[J.lArmX] = -0.7 - punch * 0.15;
    T[J.lArmZ] = 0.45;
    T[J.lElbX] = -1.35;
    T[J.lElbY] = -0.25;
    T[J.bodyRY] = -load * 0.25 + punch * 0.55;
    T[J.bodyRX] = load * 0.06 + punch * 0.14;
    T[J.bodyY] = punch * 0.04;
    T[J.lLegX] = punch * 0.35;
    T[J.rLegX] = -load * 0.1 - punch * 0.2;
    T[J.lKneeX] = 0.15 + punch * 0.2;
    T[J.rKneeX] = 0.2 + load * 0.15;
    T[J.headY] = punch * 0.12;
    T[J.headX] = -punch * 0.06;
  } else if (emote === 6 && full) {
    // Kick — chamber knee → snap extend → plant
    const chamber = Math.min(1, t * 12);
    const extend = t > 0.1 ? Math.min(1, (t - 0.1) * 14) : 0;
    const plant = t > 0.26 ? Math.min(1, (t - 0.26) * 5) : 0;
    const up = chamber * (1 - extend * 0.85);
    const k = extend * (1 - plant * 0.82);
    T[J.rLegX] = -up * 1.15 - k * 1.75;
    T[J.rKneeX] = 0.15 + up * 1.45 - k * 0.95;
    T[J.lLegX] = up * 0.15 + k * 0.28;
    T[J.lKneeX] = 0.2 + k * 0.25;
    // Arms counterbalance
    T[J.lArmX] = -0.35 - k * 0.25;
    T[J.lArmZ] = 0.55 + k * 0.35;
    T[J.lElbX] = -0.85;
    T[J.rArmX] = -0.55 - up * 0.2;
    T[J.rArmZ] = -0.45 - k * 0.2;
    T[J.rElbX] = -1.0;
    T[J.bodyRX] = -up * 0.12 - k * 0.22;
    T[J.bodyRY] = -k * 0.35;
    T[J.bodyY] = up * 0.06 + k * 0.03;
    T[J.headX] = k * 0.12;
    T[J.headY] = -k * 0.1;
  } else if (emote === 7 && full) {
    // Garba — side-step circle, clap arms in front
    const a = Math.sin(t * 6.2);
    const b = Math.sin(t * 12.4);
    T[J.bodyY] = Math.abs(a) * 0.1;
    T[J.bodyRY] = a * 0.55;
    T[J.bodyRX] = 0.06;
    T[J.lArmX] = -0.85 + b * 0.15;
    T[J.rArmX] = -0.85 - b * 0.15;
    T[J.lArmZ] = -0.55 + a * 0.35;
    T[J.rArmZ] = 0.55 - a * 0.35;
    T[J.lElbX] = -1.35 + Math.abs(b) * 0.35;
    T[J.rElbX] = -1.35 + Math.abs(b) * 0.35;
    T[J.lElbY] = -0.4;
    T[J.rElbY] = 0.4;
    T[J.lLegX] = -Math.max(0, a) * 0.55;
    T[J.rLegX] = -Math.max(0, -a) * 0.55;
    T[J.lKneeX] = 0.25 + Math.max(0, a) * 0.7;
    T[J.rKneeX] = 0.25 + Math.max(0, -a) * 0.7;
    T[J.headY] = a * 0.25;
  } else if (emote === 8 && full) {
    // Groove — shoulder bounce + arm pumps
    const pulse = Math.sin(t * 7.5);
    const sway = Math.sin(t * 3.6);
    T[J.bodyY] = 0.04 + Math.abs(pulse) * 0.09;
    T[J.bodyRY] = sway * 0.28;
    T[J.bodyRX] = pulse * 0.08;
    T[J.lArmX] = -0.45 + pulse * 0.35;
    T[J.rArmX] = -0.45 - pulse * 0.35;
    T[J.lArmZ] = 0.55 + sway * 0.25;
    T[J.rArmZ] = -0.55 - sway * 0.25;
    T[J.lElbX] = -1.1 - Math.max(0, pulse) * 0.45;
    T[J.rElbX] = -1.1 - Math.max(0, -pulse) * 0.45;
    T[J.lLegX] = sway * 0.2;
    T[J.rLegX] = -sway * 0.2;
    T[J.lKneeX] = 0.2 + Math.abs(pulse) * 0.25;
    T[J.rKneeX] = 0.2 + Math.abs(pulse) * 0.25;
    T[J.headY] = sway * 0.2;
    T[J.headX] = pulse * 0.06;
  } else if (emote === 9 && full) {
    // Bollywood — dramatic flourish, one arm high, hip sway
    const flourish = Math.sin(t * 5.2);
    const hip = Math.sin(t * 2.8);
    const kick = Math.sin(t * 5.2 + 1.2);
    T[J.bodyY] = 0.03 + Math.abs(hip) * 0.07;
    T[J.bodyRY] = hip * 0.42;
    T[J.bodyRX] = 0.05 + flourish * 0.05;
    T[J.rArmX] = -0.2;
    T[J.rArmZ] = -2.2 + flourish * 0.45;
    T[J.rElbX] = -0.35 + Math.abs(flourish) * 0.4;
    T[J.rElbZ] = flourish * 0.35;
    T[J.lArmX] = -0.9 + hip * 0.2;
    T[J.lArmZ] = 0.35;
    T[J.lElbX] = -1.55;
    T[J.lElbY] = -0.55;
    T[J.lLegX] = -Math.max(0, kick) * 0.65;
    T[J.rLegX] = hip * 0.15;
    T[J.lKneeX] = 0.2 + Math.max(0, kick) * 0.85;
    T[J.rKneeX] = 0.15;
    T[J.headY] = hip * 0.35;
    T[J.headX] = -0.05 + flourish * 0.08;
  }
}
