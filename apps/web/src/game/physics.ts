/**
 * Shared arcade-but-weighty foot / knockback helpers.
 * Vehicles still use stepDrive; this covers on-foot feel + fight impulses.
 */

export const FOOT = {
  walk: 4.45,
  sprint: 7.8,
  accel: 12.2,
  brake: 17.5,
  friction: 10.2,
  airControl: 0.42,
  gravity: 19.2,
  jump: 5.55,
  coyote: 0.1,
  radius: 0.32,
} as const;

export const COMBAT = {
  punchRange: 1.95,
  kickRange: 2.35,
  punchCone: 0.68, // cos angle ~47°
  kickCone: 0.5,
  punchForce: 8.4,
  kickForce: 11.2,
  punchDamage: 14,
  kickDamage: 20,
  cooldown: 0.48,
  stun: 0.32,
  hitEmotePunch: 5,
  hitEmoteKick: 6,
  /** Long enough for wind-up → strike → recover to finish. */
  emoteHold: 0.55,
} as const;

/** Soft accel toward target speed (grounded). */
export function approachSpeed(current: number, target: number, dt: number, accelerating: boolean): number {
  const rate = accelerating ? FOOT.accel : target === 0 ? FOOT.friction : FOOT.brake;
  const k = 1 - Math.exp(-rate * dt);
  return current + (target - current) * k;
}

/** Apply horizontal knockback and decay (m/s). */
export function integrateKnockback(
  kb: { x: number; z: number },
  dt: number,
  damp = 5.8,
): { dx: number; dz: number } {
  const dx = kb.x * dt;
  const dz = kb.z * dt;
  const f = Math.exp(-damp * dt);
  kb.x *= f;
  kb.z *= f;
  if (Math.abs(kb.x) < 0.05) kb.x = 0;
  if (Math.abs(kb.z) < 0.05) kb.z = 0;
  return { dx, dz };
}

/** Facing-cone hit test against a peer position. */
export function inStrikeCone(
  ax: number,
  az: number,
  facing: number,
  bx: number,
  bz: number,
  range: number,
  coneCos: number,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const d2 = dx * dx + dz * dz;
  if (d2 > range * range || d2 < 1e-6) return false;
  const d = Math.sqrt(d2);
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  const dot = (dx / d) * fx + (dz / d) * fz;
  return dot >= coneCos;
}
