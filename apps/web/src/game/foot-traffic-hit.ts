/** Player on foot vs traffic — momentum knockback, rare KHATAM. */
import { pointInObb, type Obb } from "../lib/obb";
import { TRAFFIC_MASS } from "../vehicles/mass";
import { KIND_INFO, type Agent } from "../vehicles/traffic";
import { footTrafficDamage, isFootTrafficFatal } from "./impact";

export type FootTrafficHit = {
  sev: number;
  nx: number;
  nz: number;
  damage: number;
  kill: boolean;
  force: number;
  up: number;
};

const PLAYER_KG = 75;

export function resolveFootTrafficHit(
  px: number,
  pz: number,
  hp: number,
  agents: Agent[],
): FootTrafficHit | null {
  let best: FootTrafficHit | null = null;
  for (const a of agents) {
    if (a.taken || a.wrecked || a.ghost > 0.05 || Math.abs(a.speed) < 3) continue;
    const info = KIND_INFO[a.kind];
    const box: Obb = {
      x: a.x,
      z: a.z,
      yaw: a.yaw,
      halfL: info.len * 0.48,
      halfW: info.wid * 0.5,
    };
    if (!pointInObb(px, pz, box)) continue;
    const mass = TRAFFIC_MASS[a.kind];
    const dmg = footTrafficDamage(a.speed, mass);
    if (dmg < 1) continue;
    const fx = Math.sin(a.yaw) * Math.sign(a.speed || 1);
    const fz = Math.cos(a.yaw) * Math.sign(a.speed || 1);
    const dx = px - a.x;
    const dz = pz - a.z;
    const d = Math.hypot(dx, dz) || 1;
    let nx = (dx / d) * 0.35 + fx * 0.65;
    let nz = (dz / d) * 0.35 + fz * 0.65;
    const inv = 1 / (Math.hypot(nx, nz) || 1);
    nx *= inv;
    nz *= inv;
    const v = Math.abs(a.speed);
    // Impulse ≈ m·Δv absorbed by pedestrian
    const impulse = v * (mass / (mass + PLAYER_KG));
    const sev = Math.min(1, impulse / 28);
    const hit: FootTrafficHit = {
      sev,
      nx,
      nz,
      damage: dmg,
      kill: isFootTrafficFatal(a.speed, mass, hp - dmg),
      force: Math.min(22, 2.5 + impulse * 0.55),
      up: Math.min(5.5, 1.1 + impulse * 0.12),
    };
    if (!best || hit.sev > best.sev) best = hit;
  }
  return best;
}
