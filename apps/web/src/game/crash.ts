/**
 * Crash / KHATAM — speed × mass, gentle damage, rare instant finish.
 */

export type CrashEvent = {
  x: number;
  z: number;
  severity: number;
  at: number;
  eject: boolean;
};

export const crashLog: CrashEvent[] = [];
const MAX = 8;

export const KHATAM = {
  holdMs: 3400,
  fatalSev: 0.96,
  fatalSpeed: 18,
} as const;

/** @deprecated use KHATAM */
export const WASTED = KHATAM;

export function reportCrash(x: number, z: number, severity: number, eject: boolean): CrashEvent {
  const ev: CrashEvent = {
    x,
    z,
    severity: severity < 0 ? 0 : severity > 1 ? 1 : severity,
    at: performance.now(),
    eject,
  };
  crashLog.push(ev);
  if (crashLog.length > MAX) crashLog.shift();
  return ev;
}

/** Closing speed (m/s) → base severity before mass / glance. */
export function crashSeverity(closing: number): number {
  if (closing < 4.5) return 0;
  // Smooth ease — low speeds stay soft, then ramps
  const t = Math.min(1, (closing - 4.5) / 20);
  return t * t * (3 - 2 * t);
}

export function massHitScale(selfMass: number, otherMass: number): number {
  const sum = selfMass + otherMass;
  if (sum <= 0) return 0.5;
  return otherMass / sum;
}

export function massWallSeverity(base: number, selfMass: number, worldMass = 50_000): number {
  const scale = massHitScale(selfMass, worldMass);
  return Math.min(1, base * (0.72 + scale * 0.48));
}

export function shouldEjectBike(severity: number, vehicleKind: number): boolean {
  return vehicleKind === 2 && severity >= 0.55;
}

export function shouldEjectCabin(severity: number, vehicleKind: number): boolean {
  return vehicleKind !== 2 && severity >= 0.91;
}

export function wallCrashSeverity(pushed: number, speed: number): number {
  const v = Math.abs(speed);
  if (pushed < 0.06 && v < 6.5) return 0;
  const t = Math.min(1, pushed * 1.55 + v / 34);
  return t * t * (1.2 - 0.2 * t);
}

/** Gentle HP curve — several mid crashes to drop you, not one. */
export function crashDamage(severity: number): number {
  if (severity < 0.22) return 0;
  const s = severity;
  return Math.min(48, Math.floor(s * s * 32 + s * 10));
}

export function isFatalCrash(severity: number, speed: number): boolean {
  return severity >= KHATAM.fatalSev && Math.abs(speed) >= KHATAM.fatalSpeed;
}

/**
 * Player severity from closing speed × mass share × glance (0 dead-on … 1 scrape).
 */
export function vehicleHitSeverity(
  closingSpeed: number,
  selfMass: number,
  otherMass: number,
  glance = 0,
): number {
  const base = crashSeverity(closingSpeed);
  if (base <= 0) return 0;
  const share = massHitScale(selfMass, otherMass);
  const g = Math.max(0, Math.min(1, glance));
  // Glancing scrapes dump most energy sideways
  const align = 1 - g * 0.72;
  return Math.min(1, base * (0.32 + share * 1.1) * align);
}

/** @deprecated prefer naturalBounce from crash-feel — kept for tests/callers. */
export function bounceSpeed(speed: number, severity: number): number {
  return speed * -(0.1 + severity * 0.35);
}

export function tumbleRoll(severity: number, rnd: number): number {
  return (rnd - 0.5) * severity * (0.7 + severity * 0.5);
}
