/** Player vs NPC traffic — normal closing speed, glance, mass-weighted smash. */
import { vehicleHitSeverity } from "./crash";
import { closingAlongNormal, glanceFactor } from "./crash-feel";
import { obbOverlap, obbPushOut, type Obb } from "../lib/obb";
import { PLAYER_MASS, selfPushShare, TRAFFIC_MASS } from "../vehicles/mass";
import { KIND_INFO, type Agent } from "../vehicles/traffic";
import { launchTrafficAgent } from "../vehicles/traffic-tumble";
import type { VehicleSpec } from "../vehicles/specs";

export type DriveCollideHit = {
  sev: number;
  nx: number;
  nz: number;
  speedBefore: number;
  flungBike: boolean;
  glance: number;
};

function agentObb(a: Agent): Obb {
  const info = KIND_INFO[a.kind];
  const padL = a.kind === 1 ? 1.25 : 1.06;
  const padW = a.kind === 1 ? 1.9 : 1.1;
  return {
    x: a.x,
    z: a.z,
    yaw: a.yaw,
    halfL: info.len * 0.5 * padL,
    halfW: info.wid * 0.5 * padW,
  };
}

function reaches(mine: Obb, a: Agent, theirs: Obb): boolean {
  if (obbOverlap(mine, theirs)) return true;
  if (a.kind !== 1) return false;
  const r = mine.halfL + theirs.halfL + 0.55;
  return (mine.x - a.x) ** 2 + (mine.z - a.z) ** 2 < r * r;
}

export function collidePlayerTraffic(
  x: number,
  z: number,
  yaw: number,
  speed: number,
  kind: 1 | 2 | 3,
  spec: VehicleSpec,
  agents: Agent[],
  out: { x: number; z: number },
): DriveCollideHit | null {
  const mine: Obb = {
    x,
    z,
    yaw,
    halfL: spec.length * 0.5,
    halfW: spec.width * 0.52,
  };
  const myMass = PLAYER_MASS[kind];
  let best: DriveCollideHit | null = null;
  let px = x;
  let pz = z;
  let flungBike = false;

  for (const a of agents) {
    if (a.ghost > 0.08) continue;
    const theirs = agentObb(a);
    const cur: Obb = { ...mine, x: px, z: pz };
    if (!reaches(cur, a, theirs)) continue;

    let push = obbPushOut(cur, theirs);
    if (push.depth < 0.06) {
      const fx = Math.sin(yaw) * Math.sign(speed || 1);
      const fz = Math.cos(yaw) * Math.sign(speed || 1);
      push = { nx: fx, nz: fz, depth: 0.35 };
    }
    const otherMass = TRAFFIC_MASS[a.kind];
    const share = selfPushShare(myMass, otherMass);
    // Separate bodies — heavy moves less
    px += push.nx * push.depth * share;
    pz += push.nz * push.depth * share;
    a.x -= push.nx * push.depth * (1 - share) * 0.85;
    a.z -= push.nz * push.depth * (1 - share) * 0.85;

    const closing = closingAlongNormal(speed, yaw, a.speed, a.yaw, push.nx, push.nz);
    const glance = glanceFactor(speed, yaw, push.nx, push.nz);
    const sev = vehicleHitSeverity(closing, myMass, otherMass, glance);

    // Fling them with relative impact energy (even when you barely feel it)
    const theirSev = vehicleHitSeverity(closing, otherMass, myMass, glance * 0.5);
    if (closing > 2.5 || Math.abs(speed) > 4) {
      launchTrafficAgent(a, push.nx, push.nz, closing, share, Math.max(theirSev, sev * 0.5));
      if (a.kind === 1 && closing > 3) flungBike = true;
    }

    if (sev <= 0.02) continue;
    if (!best || sev > best.sev) {
      best = {
        sev,
        nx: push.nx,
        nz: push.nz,
        speedBefore: speed,
        flungBike: a.kind === 1,
        glance,
      };
    }
  }

  out.x = px;
  out.z = pz;
  if (best) best.flungBike = flungBike;
  return best;
}
