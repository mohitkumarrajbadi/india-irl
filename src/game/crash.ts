/**
 * Crash / WASTED helpers — pure math, zero alloc on the hot path.
 * Police + HUD react to `crashLog`; PlayerController owns HP / respawn.
 */

export type CrashEvent = {
  x: number;
  z: number;
  /** 0 soft bump … 1 hard smash. */
  severity: number;
  at: number;
  /** Bike eject / vehicle tumble. */
  eject: boolean;
};

export const crashLog: CrashEvent[] = [];

const MAX = 8;

/** Vice City–style WASTED timing (ms). */
export const WASTED = {
  /** How long the overlay / freeze holds before respawn. */
  holdMs: 3400,
  /** Crash severity that can waste even with leftover HP (at speed). */
  fatalSev: 0.88,
  /** Min |speed| m/s for a fatal sev crash to waste. */
  fatalSpeed: 11,
} as const;

/** Record a crash site for police + FX. */
export function reportCrash(x: number, z: number, severity: number, eject: boolean): CrashEvent {
  const ev: CrashEvent = { x, z, severity: severity < 0 ? 0 : severity > 1 ? 1 : severity, at: performance.now(), eject };
  crashLog.push(ev);
  if (crashLog.length > MAX) crashLog.shift();
  return ev;
}

/** Closing-speed severity for two vehicles (m/s). */
export function crashSeverity(closing: number): number {
  if (closing < 4) return 0;
  return Math.min(1, (closing - 4) / 18);
}

/** Scooters eject riders above this severity. */
export function shouldEjectBike(severity: number, vehicleKind: number): boolean {
  return vehicleKind === 2 && severity >= 0.38;
}

/** Wall slam severity from push distance + speed. */
export function wallCrashSeverity(pushed: number, speed: number): number {
  const v = Math.abs(speed);
  if (pushed < 0.04 && v < 6) return 0;
  return Math.min(1, pushed * 2.4 + v / 26);
}

/** HP lost from an impact (quadratic — soft bumps tickle, smashes hurt). */
export function crashDamage(severity: number): number {
  if (severity < 0.22) return 0;
  return Math.min(100, Math.floor(severity * severity * 62 + severity * 18));
}

/** True if this smash should trigger WASTED regardless of remaining HP. */
export function isFatalCrash(severity: number, speed: number): boolean {
  return severity >= WASTED.fatalSev && Math.abs(speed) >= WASTED.fatalSpeed;
}

/**
 * Bounce speed after a hit — reverse a chunk of momentum (Vice City car ping).
 * Returns new signed speed.
 */
export function bounceSpeed(speed: number, severity: number): number {
  const v = Math.abs(speed);
  const bounce = v * (0.18 + severity * 0.42);
  const sign = speed >= 0 ? -1 : 1;
  return sign * Math.min(v, bounce);
}

/** Extra roll kick for tumble feel (radians). */
export function tumbleRoll(severity: number, rnd: number): number {
  return (rnd - 0.5) * severity * 1.25;
}
