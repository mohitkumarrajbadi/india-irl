/** Player vs NPC traffic — momentum, hit zone, mass-weighted smash. */
import { closingAlongNormal } from "./crash-feel";
import { resolveVehicleCollision } from "./collision-response";
import { obbOverlap, obbPushOut, type Obb } from "../lib/obb";
import { selfPushShare } from "../vehicles/mass";
import { PLAYER_PHYSICS, TRAFFIC_PHYSICS } from "../vehicles/physics-props";
import { KIND_INFO, type Agent } from "../vehicles/traffic";
import { isTwoWheeler } from "../vehicles/traffic-kinds";
import { launchTrafficAgent } from "../vehicles/traffic-tumble";
import type { VehicleSpec } from "../vehicles/specs";

export type DriveCollideHit = {
  sev: number;
  nx: number;
  nz: number;
  speedBefore: number;
  flungBike: boolean;
  glance: number;
  /** Suggested post-impact signed speed. */
  speedAfter: number;
  yawKick: number;
  otherMass: number;
  closing: number;
  zone: "front" | "side" | "rear";
};

function agentObb(a: Agent): Obb {
  const info = KIND_INFO[a.kind];
  const padL = isTwoWheeler(a.kind) ? 1.25 : 1.06;
  const padW = isTwoWheeler(a.kind) ? 1.9 : 1.1;
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
  const selfPhys = PLAYER_PHYSICS[kind];
  const myMass = selfPhys.mass;
  let best: DriveCollideHit | null = null;
  let px = x;
  let pz = z;
  let flungBike = false;

  for (const a of agents) {
    if (a.taken || a.wrecked || a.ghost > 0.08) continue;
    const theirs = agentObb(a);
    const cur: Obb = { ...mine, x: px, z: pz };
    if (!reaches(cur, a, theirs)) continue;

    let push = obbPushOut(cur, theirs);
    if (push.depth < 0.06) {
      const fx = Math.sin(yaw) * Math.sign(speed || 1);
      const fz = Math.cos(yaw) * Math.sign(speed || 1);
      push = { nx: fx, nz: fz, depth: 0.35 };
    }
    const otherPhys = TRAFFIC_PHYSICS[a.kind];
    const otherMass = otherPhys.mass;
    const share = selfPushShare(myMass, otherMass);
    px += push.nx * push.depth * share;
    pz += push.nz * push.depth * share;
    a.x -= push.nx * push.depth * (1 - share) * 0.85;
    a.z -= push.nz * push.depth * (1 - share) * 0.85;

    const outcome = resolveVehicleCollision({
      self: selfPhys,
      other: otherPhys,
      selfSpeed: speed,
      selfYaw: yaw,
      otherSpeed: a.speed,
      otherYaw: a.yaw,
      nx: push.nx,
      nz: push.nz,
    });

    a.speed += outcome.otherSpeedDelta;
    a.yaw += outcome.otherYawKick;
    const closing = outcome.closing || closingAlongNormal(speed, yaw, a.speed, a.yaw, push.nx, push.nz);

    if (closing > 2.5 || Math.abs(speed) > 4) {
      launchTrafficAgent(
        a,
        push.nx,
        push.nz,
        closing,
        share,
        Math.max(outcome.otherSev, outcome.selfSev * 0.5),
      );
      if (isTwoWheeler(a.kind) && closing > 3) flungBike = true;
    }

    if (outcome.selfSev <= 0.02) continue;
    if (!best || outcome.selfSev > best.sev) {
      best = {
        sev: outcome.selfSev,
        nx: push.nx,
        nz: push.nz,
        speedBefore: speed,
        flungBike: isTwoWheeler(a.kind),
        glance: outcome.glance,
        speedAfter: outcome.selfSpeed,
        yawKick: outcome.selfYawKick,
        otherMass,
        closing: outcome.closing,
        zone: outcome.zone,
      };
    }
  }

  out.x = px;
  out.z = pz;
  if (best) best.flungBike = flungBike;
  return best;
}
