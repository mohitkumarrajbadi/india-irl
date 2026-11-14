/**
 * Natural crash responses — bounce, scrub, shake, eject impulse.
 * Arcade signed-speed model, but along the contact normal like real impacts.
 */

/** Soft bump: keep direction, bleed speed (no ping-pong reverse). */
export function softSpeedScrub(speed: number, severity: number): number {
  const loss = Math.min(0.62, 0.06 + severity * 0.55);
  return speed * (1 - loss);
}

/**
 * Reflect drive speed against a push-out normal.
 * Keeps glancing (tangent) motion; only the “into wall” part bounces back.
 */
export function naturalBounce(
  speed: number,
  yaw: number,
  nx: number,
  nz: number,
  severity: number,
): { speed: number; yawKick: number } {
  const inv = 1 / (Math.hypot(nx, nz) || 1);
  const nxx = nx * inv;
  const nzz = nz * inv;
  const fx = Math.sin(yaw) * speed;
  const fz = Math.cos(yaw) * speed;
  // Velocity into the surface (opposite push-out)
  const into = Math.max(0, -(fx * nxx + fz * nzz));
  const tx = fx + into * nxx;
  const tz = fz + into * nzz;
  // Restitution rises a bit with severity; friction kills slide on hard hits
  const e = 0.1 + severity * 0.32;
  const slide = 0.72 - severity * 0.35;
  const rx = tx * slide + nxx * into * e;
  const rz = tz * slide + nzz * into * e;
  const newSpd = rx * Math.sin(yaw) + rz * Math.cos(yaw);
  // Sideways leftover → small yaw kick so the nose turns with the scrape
  const side = rx * Math.cos(yaw) - rz * Math.sin(yaw);
  const yawKick = Math.max(-0.55, Math.min(0.55, side * 0.045 * (0.4 + severity)));
  return { speed: newSpd, yawKick };
}

/** Camera shake from impulse (severity × speed proxy). */
export function impactShake(severity: number, speed: number): number {
  const v = Math.min(1, Math.abs(speed) / 18);
  return Math.min(1.15, 0.08 + severity * 0.55 + v * severity * 0.35);
}

/** Eject knockback (m/s) — scales with crash energy, not a flat cartoon launch. */
export function ejectImpulse(severity: number, speedBefore: number): { force: number; up: number } {
  const v = Math.abs(speedBefore);
  const energy = severity * (0.35 + v / 20);
  return {
    force: 3.5 + energy * 11,
    up: 1.6 + energy * 3.8,
  };
}

/**
 * Closing speed along contact normal (how hard you actually hit).
 * Same-direction rear-end ≪ head-on at the same |v1|+|v2|.
 */
export function closingAlongNormal(
  speedA: number,
  yawA: number,
  speedB: number,
  yawB: number,
  nx: number,
  nz: number,
): number {
  const ax = Math.sin(yawA) * speedA;
  const az = Math.cos(yawA) * speedA;
  const bx = Math.sin(yawB) * speedB;
  const bz = Math.cos(yawB) * speedB;
  const relx = ax - bx;
  const relz = az - bz;
  const inv = 1 / (Math.hypot(nx, nz) || 1);
  // Approach rate into B (along -n if n pushes A out of B)
  return Math.max(0, -(relx * nx * inv + relz * nz * inv));
}

/** 0 = dead-on, 1 = pure glance — softens damage on scrapes. */
export function glanceFactor(
  speed: number,
  yaw: number,
  nx: number,
  nz: number,
): number {
  const v = Math.abs(speed);
  if (v < 0.4) return 0.5;
  const fx = Math.sin(yaw) * Math.sign(speed);
  const fz = Math.cos(yaw) * Math.sign(speed);
  const inv = 1 / (Math.hypot(nx, nz) || 1);
  const align = Math.abs(fx * nx * inv + fz * nz * inv);
  return Math.max(0, 1 - align);
}
