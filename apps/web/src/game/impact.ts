/**
 * Ped / foot smash — speed × mass outcomes (brush / thrown / runover).
 */

export type PedHitKind = "brush" | "thrown" | "runover";

export const DEATH_WORD = "KHATAM" as const;

export function classifyPedHit(speed: number, vehicleMass: number): PedHitKind {
  const v = Math.abs(speed);
  if (v < 5.5) return "brush";
  if (v >= 15 && vehicleMass >= 900) return "runover";
  if (v >= 13 && vehicleMass >= 1600) return "runover";
  if (v >= 7.5) return "thrown";
  return "brush";
}

export function pedThrowSpeed(speed: number, vehicleMass: number): number {
  const v = Math.abs(speed);
  // Transfer a fraction of vehicle speed — heavier pushes harder
  const transfer = 0.45 + Math.min(0.4, vehicleMass / 5000);
  return Math.min(18, v * transfer + 1.5);
}

export function pedThrowUp(speed: number): number {
  const v = Math.abs(speed);
  return Math.min(5.5, 1.2 + v * 0.22);
}

export function pedHitSeverity(kind: PedHitKind, speed: number): number {
  const v = Math.abs(speed);
  if (kind === "brush") return Math.min(0.2, v / 40);
  if (kind === "thrown") return Math.min(0.5, 0.15 + (v - 6) / 30);
  return Math.min(0.65, 0.28 + (v - 10) / 26);
}

export function footTrafficDamage(agentSpeed: number, agentMass: number): number {
  const v = Math.abs(agentSpeed);
  if (v < 4) return 0;
  const impulse = (v - 3) * (agentMass / (agentMass + 75));
  return Math.min(55, Math.floor(impulse * 2.6));
}

export function isFootTrafficFatal(agentSpeed: number, agentMass: number, hpAfter: number): boolean {
  if (hpAfter <= 0) return true;
  const v = Math.abs(agentSpeed);
  return v >= 17 && agentMass >= 5000;
}
