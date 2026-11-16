/** Post-hit skid / tumble — bikes spin more, heavy vehicles slide. */
import type { EjectedBodyPool } from "./ejected-bodies.ts";
import { isHeavyTraffic, isTwoWheeler, type Agent } from "./traffic-kinds.ts";

/** Optional pool — set from Traffic mount so smash can throw pillions. */
let ejectPool: EjectedBodyPool | null = null;

export function setEjectedBodyPool(pool: EjectedBodyPool | null): void {
  ejectPool = pool;
}

export function tickTrafficTumble(a: Agent, dt: number): boolean {
  if (a.ghost <= 0) return false;
  a.ghost -= dt;
  const spd = Math.hypot(a.kbX, a.kbZ);
  const flying = spd > 0.35 || Math.abs(a.spin) > 0.15;
  if (!flying) return false;
  a.x += a.kbX * dt;
  a.z += a.kbZ * dt;
  a.yaw += a.spin * dt;
  // Ground friction — bikes keep sliding a touch longer
  const damp = isTwoWheeler(a.kind) ? 1.6 : isHeavyTraffic(a.kind) ? 3.2 : 2.4;
  const f = Math.exp(-damp * dt);
  a.kbX *= f;
  a.kbZ *= f;
  a.spin *= Math.exp(-(damp * 0.85) * dt);
  a.speed = 0;
  return true;
}

/**
 * Launch from smash. `share` = selfPushShare(player, agent) — high share means
 * agent is heavier and moves less.
 */
export function launchTrafficAgent(
  a: Agent,
  nx: number,
  nz: number,
  impactSpeed: number,
  share: number,
  sev: number,
): void {
  const bike = isTwoWheeler(a.kind);
  const heavy = isHeavyTraffic(a.kind);
  const inv = 1 / (Math.hypot(nx, nz) || 1);
  const nxx = nx * inv;
  const nzz = nz * inv;
  // Exit velocity along push — light vehicles take more of the impulse
  const take = Math.max(0.12, 1 - share);
  const mul = bike ? 1.55 : heavy ? 0.45 : 0.9;
  const throwV = Math.min(22, Math.max(1.2, impactSpeed * (0.4 + take * 0.85) * mul));
  a.kbX = -nxx * throwV;
  a.kbZ = -nzz * throwV;
  // Add a bit of their old heading so rear-ends look like a shove, not a teleport
  a.kbX += Math.sin(a.yaw) * a.speed * 0.25;
  a.kbZ += Math.cos(a.yaw) * a.speed * 0.25;
  const spinMul = bike ? 2.4 : heavy ? 0.35 : 1;
  a.spin = (Math.random() - 0.5) * (3 + sev * 12) * spinMul;
  a.speed = 0;
  a.ghost = Math.max(a.ghost, (bike ? 1.3 : heavy ? 0.5 : 0.75) + sev * 1.4);

  // Bike smash — throw driver + random pillion clear of the chassis
  if (bike && ejectPool && impactSpeed > 3.2) {
    ejectPool.spawn(a.x, a.z, a.yaw, nxx, nzz, sev, 0);
    if (a.hasPillion) {
      ejectPool.spawn(a.x, a.z, a.yaw, nxx, nzz, sev * 0.9, 0.55);
      a.hasPillion = false;
    }
    // Leave chassis as a visible fallen wreck after tumble settles
    a.wrecked = true;
  }
}

/** Throw an NPC pillion clear (carjack / mid-drive steal). */
export function ejectTrafficPillion(a: Agent): void {
  if (!a.hasPillion || !ejectPool) {
    a.hasPillion = false;
    return;
  }
  const fx = Math.sin(a.yaw);
  const fz = Math.cos(a.yaw);
  ejectPool.spawn(a.x, a.z, a.yaw, fx, fz, 0.55, 0.55);
  a.hasPillion = false;
}
