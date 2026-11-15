/** Per-frame agent update (desired speed, steering, signals, lane change). */
import { clamp, wrapAngle } from "../lib/math.ts";
import { signalWantScale } from "../world/signals.ts";
import { pickLaneChange } from "./traffic-lane.ts";
import { tickTrafficTumble } from "./traffic-tumble.ts";
import { DX, DZ, KIND_INFO, type Agent, type Obstacle } from "./traffic-kinds.ts";
import { junctionValid, planAgent, respawnAgent, type NavCtx } from "./traffic-nav.ts";

export function stepAgent(
  ctx: NavCtx,
  agents: Agent[],
  n: number,
  dt: number,
  px: number,
  pz: number,
  obstacles: readonly Obstacle[],
): void {
  const a = agents[n];
  if (a.taken) return;
  const info = KIND_INFO[a.kind];
  const city = ctx.city;

  const dxp = a.x - px;
  const dzp = a.z - pz;
  if (dxp * dxp + dzp * dzp > 200 * 200) {
    respawnAgent(ctx, a, px, pz);
    return;
  }

  if (tickTrafficTumble(a, dt)) return;

  const toX = a.tx - a.x;
  const toZ = a.tz - a.z;
  const toDist = Math.hypot(toX, toZ);
  const err = wrapAngle(Math.atan2(toX, toZ) - a.yaw);
  let want = a.top;
  if (a.stage === 0 && toDist < 18) want *= 0.7;
  if (Math.abs(err) > 0.5) want *= 0.5;
  if (a.stage === 0) {
    const jx = city.xs[a.ni] - a.x;
    const jz = city.zs[a.nj] - a.z;
    const jDist = Math.hypot(jx, jz);
    // Signal against approach direction (before plan flipped a.dir).
    want *= signalWantScale(a.ni, a.nj, a.approachDir, jDist, performance.now() * 0.001);
  }

  if (a.ghost <= 0) {
    want = applyLookahead(a, info, agents, n, want, obstacles);
  }

  // Overtake / lane change when bottled up
  if (a.laneTimer <= 0 && want < 2.2 && a.speed > 1.5) {
    const change = pickLaneChange(city, a, agents, n, obstacles);
    if (change) {
      a.lane = change.lane;
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

  const maxYaw = Math.max(0.4, a.speed / info.turn);
  a.yaw += clamp(err * 4, -maxYaw, maxYaw) * dt;
  a.x += Math.sin(a.yaw) * a.speed * dt;
  a.z += Math.cos(a.yaw) * a.speed * dt;

  // Lateral lane-change drift in local +X
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
    } else {
      a.turnBlinker = 0;
      a.blinker = 0;
      a.ni += DX[a.dir];
      a.nj += DZ[a.dir];
      if (!junctionValid(ctx.cols, ctx.rows, a.ni, a.nj)) respawnAgent(ctx, a, px, pz);
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
    const o = agents[m];
    if (o.taken) continue;
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const along = rx * sin + rz * cos;
    if (along < 0.2 || along > look + KIND_INFO[o.kind].len) continue;
    const lat = rx * cos - rz * sin;
    const oi = KIND_INFO[o.kind];
    if (Math.abs(lat) > (info.wid + oi.wid) * 0.5 + 0.35) continue;
    const gap = along - (info.len + oi.len) * 0.5;
    // Follow at a natural gap; hard brake when closing on a stopped vehicle.
    const follow = o.speed < 1 ? 2.4 : 1.4;
    want = Math.min(want, Math.max(0, (gap - follow) * 1.35 + o.speed * 0.35));
  }
  for (let m = 0; m < obstacles.length; m += 1) {
    const o = obstacles[m];
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const along = rx * sin + rz * cos;
    if (along < 0 || along > look + 6) continue;
    const lat = rx * cos - rz * sin;
    if (Math.abs(lat) > o.r + info.wid * 0.5 + 0.4) continue;
    // Player / peers — leave more space, brake earlier
    const pad = o.r > 0.7 ? 2.4 : 1.5;
    want = Math.min(want, Math.max(0, (along - o.r - info.len * 0.5 - pad) * 1.55));
  }
  return want;
}
