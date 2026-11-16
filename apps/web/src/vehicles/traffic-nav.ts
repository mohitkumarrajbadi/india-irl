/** Place / plan / respawn helpers for TrafficSim. */
import { clamp } from "../lib/math.ts";
import type { Rng } from "../lib/rng.ts";
import { lineIndex } from "../world/generate.ts";
import { isRuralAt } from "../world/terrain-sample.ts";
import type { CityData, RoadLine } from "../world/types.ts";
import { blinkerForTurn, DX, DZ, KIND_INFO, turnBetween, type Agent } from "./traffic-kinds.ts";
import { spawnPlacementOk, spawnPlacementScore } from "./traffic-spawn.ts";

export type NavCtx = {
  city: CityData;
  cols: number;
  rows: number;
  rng: Rng;
};

function roadAlong(city: CityData, i: number, j: number, dir: number): RoadLine {
  return dir % 2 === 0 ? city.roadsX[i] : city.roadsZ[j];
}

function valid(cols: number, rows: number, i: number, j: number): boolean {
  return i >= 0 && i <= cols && j >= 0 && j <= rows;
}

function resetSignals(a: Agent): void {
  a.blinker = 0;
  a.turnBlinker = 0;
  a.braking = false;
  a.laneTimer = 0;
  a.laneStrafe = 0;
}

/** Place an agent on the lane between two junctions. */
export function placeAgent(ctx: NavCtx, a: Agent, i: number, j: number, dir: number): void {
  const { city, rng } = ctx;
  const { xs, zs } = city;
  const ni = i + DX[dir];
  const nj = j + DZ[dir];
  const road = roadAlong(city, i, j, dir);
  a.lane = Math.floor(rng() * road.lanes.length);
  const off = road.lanes[a.lane]!;
  const f = 0.25 + rng() * 0.5;
  const x = xs[i]! + (xs[ni]! - xs[i]!) * f;
  const z = zs[j]! + (zs[nj]! - zs[j]!) * f;
  a.x = x + DZ[dir]! * off;
  a.z = z - DX[dir]! * off;
  a.yaw = Math.atan2(DX[dir]!, DZ[dir]!);
  a.speed = 4 + rng() * 4;
  a.ni = ni;
  a.nj = nj;
  a.dir = dir;
  a.approachDir = dir;
  a.top = KIND_INFO[a.kind].top * (0.75 + rng() * 0.4);
  a.stuck = 0;
  a.ghost = 0;
  a.kbX = 0;
  a.kbZ = 0;
  a.spin = 0;
  a.taken = false;
  a.wrecked = false;
  a.appearT = 0.45;
  a.exitLane = a.lane;
  resetSignals(a);
  planAgent(ctx, a);
}

/**
 * Retarget stage-0 waypoint lateral offset after a mid-block lane change
 * so seek doesn't yank back to the old lane.
 */
export function retargetLaneWaypoint(ctx: NavCtx, a: Agent, newLane: number): void {
  const { city } = ctx;
  const travel = a.stage === 0 ? a.approachDir : a.dir;
  const bi = a.ni - DX[travel]!;
  const bj = a.nj - DZ[travel]!;
  const road = roadAlong(city, bi, bj, travel);
  const lanes = road.lanes.length > 0 ? road.lanes : roadAlong(city, a.ni, a.nj, a.dir).lanes;
  if (lanes.length === 0) {
    a.lane = newLane;
    return;
  }
  const oldOff = lanes[Math.min(a.lane, lanes.length - 1)]!;
  const nextOff = lanes[Math.min(newLane, lanes.length - 1)]!;
  const dOff = nextOff - oldOff;
  if (a.stage === 0) {
    a.tx += DZ[travel]! * dOff;
    a.tz -= DX[travel]! * dOff;
  } else {
    a.tx += DZ[a.dir]! * dOff;
    a.tz -= DX[a.dir]! * dOff;
    a.t2x += DZ[a.dir]! * dOff;
    a.t2z -= DX[a.dir]! * dOff;
  }
  a.lane = newLane;
}

/** Choose the next turn at the junction (ni, nj) and set the entry/exit waypoints. */
export function planAgent(ctx: NavCtx, a: Agent): void {
  const { city, cols, rows, rng } = ctx;
  const { xs, zs } = city;
  const d = a.dir;
  a.approachDir = d;
  const options: number[] = [];
  const weights: number[] = [];
  for (const [turn, w] of [
    [0, 0.62],
    [1, 0.19],
    [3, 0.19],
  ] as const) {
    const d2 = (d + turn) % 4;
    if (valid(cols, rows, a.ni + DX[d2]!, a.nj + DZ[d2]!)) {
      options.push(d2);
      weights.push(w);
    }
  }
  let d2 = (d + 2) % 4;
  if (options.length > 0) {
    let r = rng() * weights.reduce((s, w) => s + w, 0);
    d2 = options[options.length - 1]!;
    for (let k = 0; k < options.length; k += 1) {
      r -= weights[k]!;
      if (r <= 0) {
        d2 = options[k]!;
        break;
      }
    }
  }

  const turn = turnBetween(d, d2);
  a.turnBlinker = blinkerForTurn(turn);
  a.blinker = a.turnBlinker;

  const roadIn = roadAlong(city, a.ni, a.nj, d);
  const roadOut = roadAlong(city, a.ni, a.nj, d2);
  const crossIn = roadAlong(city, a.ni, a.nj, (d + 1) % 4);
  const nx = xs[a.ni]!;
  const nz = zs[a.nj]!;
  const laneIn = Math.min(a.lane, roadIn.lanes.length - 1);
  const offIn = roadIn.lanes[laneIn]!;
  // Prefer keep-lane across junctions; occasional lane pick for variety.
  let exitLane = Math.min(a.lane, roadOut.lanes.length - 1);
  if (rng() < 0.18) exitLane = Math.floor(rng() * roadOut.lanes.length);
  const offOut = roadOut.lanes[exitLane]!;
  const uturn = d2 === (d + 2) % 4;
  a.tx = nx + DZ[d]! * offIn - DX[d]! * (crossIn.half + 0.6);
  a.tz = nz - DX[d]! * offIn - DZ[d]! * (crossIn.half + 0.6);
  a.t2x = nx + DZ[d2]! * offOut + DX[d2]! * (roadIn.half + 0.6);
  a.t2z = nz - DX[d2]! * offOut + DZ[d2]! * (roadIn.half + 0.6);
  if (uturn) {
    a.t2x += DX[d2]! * 4;
    a.t2z += DZ[d2]! * 4;
  }
  // Keep current lane through approach; apply exit lane when stage flips.
  a.exitLane = exitLane;
  a.dir = d2;
  a.stage = 0;
}

/**
 * Recycle an agent outside cull into a mid-far, preferably behind-camera road slot.
 * @param pyaw Player/camera yaw (atan2(sin, cos) travel convention).
 */
export function respawnAgent(ctx: NavCtx, a: Agent, px: number, pz: number, pyaw = 0): void {
  const { city, cols, rows, rng } = ctx;
  const { xs, zs } = city;
  const rural = isRuralAt(city, px, pz);
  const ci = Math.floor(cols / 2);
  const cj = Math.floor(rows / 2);
  const pi = rural ? ci : lineIndex(xs, px);
  const pj = rural ? cj : lineIndex(zs, pz);
  const spread = rural ? 5 : 9;
  const fwdX = Math.sin(pyaw);
  const fwdZ = Math.cos(pyaw);

  let bestI = -1;
  let bestJ = -1;
  let bestDir = 0;
  let bestScore = -1e9;

  for (let tries = 0; tries < 22; tries += 1) {
    const i = clamp(pi + Math.floor(rng() * (spread * 2 + 1)) - spread, 0, cols - 1);
    const j = clamp(pj + Math.floor(rng() * (spread * 2 + 1)) - spread, 0, rows - 1);
    if (rural) {
      const blk = city.blocks[i * city.config.rows + j];
      if (blk?.fringe) continue;
      if (i <= 0 || j <= 0 || i >= cols - 1 || j >= rows - 1) continue;
    }
    // Prefer travel dirs that leave the player cell (not random facing into them).
    const dirs = [0, 1, 2, 3];
    for (let s = dirs.length - 1; s > 0; s -= 1) {
      const r = Math.floor(rng() * (s + 1));
      const tmp = dirs[s]!;
      dirs[s] = dirs[r]!;
      dirs[r] = tmp;
    }
    for (const dir of dirs) {
      if (!valid(cols, rows, i + DX[dir]!, j + DZ[dir]!)) continue;
      placeAgent(ctx, a, i, j, dir);
      const dx = a.x - px;
      const dz = a.z - pz;
      const d = Math.hypot(dx, dz);
      if (d < 1e-3) continue;
      const inv = 1 / d;
      const ahead = (dx * inv) * fwdX + (dz * inv) * fwdZ;
      const hx = Math.sin(a.yaw);
      const hz = Math.cos(a.yaw);
      const leaving = hx * dx + hz * dz;
      const leavingN = leaving / d;
      if (spawnPlacementOk(d, ahead, leavingN, rural)) return;
      const score = spawnPlacementScore(d, ahead, leavingN, rural);
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
        bestJ = j;
        bestDir = dir;
      }
    }
  }

  // Best imperfect candidate — never fall back onto the player's grid cell.
  if (bestI >= 0 && bestScore > -1e8) {
    placeAgent(ctx, a, bestI, bestJ, bestDir);
    a.appearT = 0.45;
    return;
  }
  // Last resort: behind the camera along a ring, not city-core (avoids FOV pops).
  const backYaw = pyaw + Math.PI;
  const ring = rural ? 120 : 110;
  const bx = px + Math.sin(backYaw) * ring + (rng() - 0.5) * 40;
  const bz = pz + Math.cos(backYaw) * ring + (rng() - 0.5) * 40;
  const fi = clamp(lineIndex(xs, bx) + Math.floor(rng() * 3) - 1, 1, cols - 2);
  const fj = clamp(lineIndex(zs, bz) + Math.floor(rng() * 3) - 1, 1, rows - 2);
  let fdir = Math.floor(rng() * 4);
  for (let k = 0; k < 4; k += 1) {
    const d = (fdir + k) % 4;
    if (valid(cols, rows, fi + DX[d]!, fj + DZ[d]!)) {
      fdir = d;
      break;
    }
  }
  placeAgent(ctx, a, fi, fj, fdir);
  a.appearT = 0.45;
}

export function junctionValid(cols: number, rows: number, i: number, j: number): boolean {
  return valid(cols, rows, i, j);
}
