/** Per-frame agent update (desired speed, steering, signals, lane change). */
import { clamp, wrapAngle } from "../lib/math.ts";
import { ambientLodAt } from "../world/ambient-lod.ts";
import { signalWantScale } from "../world/signals.ts";
import { followWant } from "./traffic-follow.ts";
import { junctionAimPoint } from "./traffic-junction.ts";
import { pickLaneChange } from "./traffic-lane.ts";
import { tickTrafficTumble } from "./traffic-tumble.ts";
import { trafficYawStep } from "./traffic-yaw.ts";
import { DX, DZ, KIND_INFO, type Agent, type Obstacle } from "./traffic-kinds.ts";
import { junctionValid, planAgent, respawnAgent, retargetLaneWaypoint, type NavCtx } from "./traffic-nav.ts";

export function stepAgent(
  ctx: NavCtx,
  agents: Agent[],
  n: number,
  dt: number,
  px: number,
  pz: number,
  obstacles: readonly Obstacle[],
  pyaw = 0,
): void {
  const a = agents[n]!;
  if (a.taken) return;
  if (a.wrecked) {
    a.speed = 0;
    a.braking = false;
    if (a.appearT > 0) a.appearT = Math.max(0, a.appearT - dt);
    return;
  }
  const info = KIND_INFO[a.kind];
  const city = ctx.city;

  if (a.appearT > 0) a.appearT = Math.max(0, a.appearT - dt);

  const lod = ambientLodAt(city, px, pz);
  const cull = lod.trafficCull;
  const cull2 = cull * cull;
  // Hysteresis: only recycle well past cull, and never while still ahead in camera FOV
  const far2 = (cull * 1.28) * (cull * 1.28);
  const dxp = a.x - px;
  const dzp = a.z - pz;
  const d2 = dxp * dxp + dzp * dzp;
  if (d2 > far2) {
    const inv = 1 / Math.sqrt(d2);
    const ahead = dxp * inv * Math.sin(pyaw) + dzp * inv * Math.cos(pyaw);
    // Keep on-screen traffic a bit longer so cars don't vanish mid-view
    if (ahead < 0.35 || d2 > (cull * 1.55) * (cull * 1.55)) {
      respawnAgent(ctx, a, px, pz, pyaw);
      return;
    }
  }

  if (tickTrafficTumble(a, dt)) return;

  const toX0 = a.tx - a.x;
  const toZ0 = a.tz - a.z;
  const toDist = Math.hypot(toX0, toZ0);
  const aim =
    a.stage === 0
      ? junctionAimPoint({
          x: a.x,
          z: a.z,
          tx: a.tx,
          tz: a.tz,
          t2x: a.t2x,
          t2z: a.t2z,
          toDist,
          blendStart: 11,
        })
      : { x: a.tx, z: a.tz };
  const toX = aim.x - a.x;
  const toZ = aim.z - a.z;
  const err = wrapAngle(Math.atan2(toX, toZ) - a.yaw);
  let want = a.top;
  if (a.stage === 0 && toDist < 18) want *= 0.7;
  if (Math.abs(err) > 0.5) want *= 0.55;
  if (a.stage === 0) {
    const jx = city.xs[a.ni]! - a.x;
    const jz = city.zs[a.nj]! - a.z;
    const jDist = Math.hypot(jx, jz);
    want *= signalWantScale(a.ni, a.nj, a.approachDir, jDist, performance.now() * 0.001);
  }

  if (a.ghost <= 0) {
    want = applyLookahead(a, info, agents, n, want, obstacles);
  }

  if (a.laneTimer <= 0 && want < 2.2 && a.speed > 1.5) {
    const change = pickLaneChange(city, a, agents, n, obstacles);
    if (change) {
      retargetLaneWaypoint(ctx, a, change.lane);
      a.laneStrafe = change.strafe;
      a.laneTimer = 1.35;
      a.blinker = change.blinker;
    }
  }

  if (a.stuck > 0 || (a.speed < 0.4 && want < 0.4)) {
    a.stuck += dt;
    if (a.stuck > 6) {
      a.ghost = 4;
      a.stuck = 0;
    }
  } else a.stuck = Math.max(0, a.stuck - dt);

  const prev = a.speed;
  const dv = want - a.speed;
  a.speed += clamp(dv, -info.brake * dt, info.accel * dt);
  a.braking = a.speed < prev - 0.15 || (want < prev - 1.2 && a.speed > 0.8);

  a.yaw += trafficYawStep(err, a.speed, info.turn, dt);
  a.x += Math.sin(a.yaw) * a.speed * dt;
  a.z += Math.cos(a.yaw) * a.speed * dt;

  if (a.laneTimer > 0) {
    const cos = Math.cos(a.yaw);
    const sin = Math.sin(a.yaw);
    const lat = a.laneStrafe * Math.min(3.2, 2.4 + a.speed * 0.15) * dt;
    a.x += cos * lat;
    a.z -= sin * lat;
    a.laneTimer -= dt;
    if (a.laneTimer <= 0) {
      a.laneTimer = 0;
      a.laneStrafe = 0;
      a.blinker = a.turnBlinker;
    }
  }

  if (toDist < 3.2) {
    if (a.stage === 0) {
      a.tx = a.t2x;
      a.tz = a.t2z;
      a.stage = 1;
      a.lane = a.exitLane;
    } else {
      a.turnBlinker = 0;
      a.blinker = 0;
      a.ni += DX[a.dir]!;
      a.nj += DZ[a.dir]!;
      if (!junctionValid(ctx.cols, ctx.rows, a.ni, a.nj)) respawnAgent(ctx, a, px, pz, pyaw);
      else planAgent(ctx, a);
    }
  }
}

function applyLookahead(
  a: Agent,
  info: (typeof KIND_INFO)[0],
  agents: Agent[],
  n: number,
  want: number,
  obstacles: readonly Obstacle[],
): number {
  const sin = Math.sin(a.yaw);
  const cos = Math.cos(a.yaw);
  const look = 6 + a.speed * 1.15 + info.len * 0.5;
  for (let m = 0; m < agents.length; m += 1) {
    if (m === n) continue;
    const o = agents[m]!;
    if (o.taken) continue;
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const along = rx * sin + rz * cos;
    if (along < 0.2 || along > look + KIND_INFO[o.kind].len) continue;
    const lat = rx * cos - rz * sin;
    const oi = KIND_INFO[o.kind];
    if (Math.abs(lat) > (info.wid + oi.wid) * 0.5 + 0.35) continue;
    const gap = along - (info.len + oi.len) * 0.5;
    const oSpeed = o.wrecked ? 0 : o.speed;
    const follow = oSpeed < 1 ? 2.4 : 1.4;
    want = Math.min(want, followWant(gap, a.speed, oSpeed, follow));
  }
  for (let m = 0; m < obstacles.length; m += 1) {
    const o = obstacles[m]!;
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const along = rx * sin + rz * cos;
    if (along < 0 || along > look + 6) continue;
    const lat = rx * cos - rz * sin;
    if (Math.abs(lat) > o.r + info.wid * 0.5 + 0.4) continue;
    const pad = o.r > 0.7 ? 2.4 : 1.5;
    const gap = along - o.r - info.len * 0.5;
    want = Math.min(want, followWant(gap, a.speed, 0, pad));
  }
  return want;
}
