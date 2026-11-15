/** Place / plan / respawn helpers for TrafficSim. */
import { clamp } from "../lib/math.ts";
import type { Rng } from "../lib/rng.ts";
import { lineIndex } from "../world/generate.ts";
import { isRuralAt } from "../world/terrain-sample.ts";
import type { CityData, RoadLine } from "../world/types.ts";
import { blinkerForTurn, DX, DZ, KIND_INFO, turnBetween, type Agent } from "./traffic-kinds.ts";

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
  const off = road.lanes[a.lane];
  const f = 0.25 + rng() * 0.5;
  const x = xs[i] + (xs[ni] - xs[i]) * f;
  const z = zs[j] + (zs[nj] - zs[j]) * f;
  a.x = x + DZ[dir] * off;
  a.z = z - DX[dir] * off;
  a.yaw = Math.atan2(DX[dir], DZ[dir]);
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
  resetSignals(a);
  planAgent(ctx, a);
}

/** Choose the next turn at the junction (ni, nj) and set the entry/exit waypoints. */
export function planAgent(ctx: NavCtx, a: Agent): void {
  const { city, cols, rows, rng } = ctx;
  const { xs, zs } = city;
  const d = a.dir;
  a.approachDir = d;
  const options: number[] = [];
  const weights: number[] = [];
  for (const [turn, w] of [[0, 0.62], [1, 0.19], [3, 0.19]] as const) {
    const d2 = (d + turn) % 4;
    if (valid(cols, rows, a.ni + DX[d2], a.nj + DZ[d2])) {
      options.push(d2);
      weights.push(w);
    }
  }
  let d2 = (d + 2) % 4;
  if (options.length > 0) {
    let r = rng() * weights.reduce((s, w) => s + w, 0);
    d2 = options[options.length - 1];
    for (let k = 0; k < options.length; k += 1) {
      r -= weights[k];
      if (r <= 0) {
        d2 = options[k];
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
  const nx = xs[a.ni];
  const nz = zs[a.nj];
  const offIn = roadIn.lanes[Math.min(a.lane, roadIn.lanes.length - 1)];
  const newLane = Math.floor(rng() * roadOut.lanes.length);
  const offOut = roadOut.lanes[newLane];
  const uturn = d2 === (d + 2) % 4;
  a.tx = nx + DZ[d] * offIn - DX[d] * (crossIn.half + 0.6);
  a.tz = nz - DX[d] * offIn - DZ[d] * (crossIn.half + 0.6);
  a.t2x = nx + DZ[d2] * offOut + DX[d2] * (roadIn.half + 0.6);
  a.t2z = nz - DX[d2] * offOut + DZ[d2] * (roadIn.half + 0.6);
  if (uturn) {
    a.t2x += DX[d2] * 4;
    a.t2z += DZ[d2] * 4;
  }
  a.lane = newLane;
  a.dir = d2;
  a.stage = 0;
}

export function respawnAgent(ctx: NavCtx, a: Agent, px: number, pz: number): void {
  const { city, cols, rows, rng } = ctx;
  const { xs, zs } = city;
  const rural = isRuralAt(city, px, pz);
  // On village / hill roads: keep fleet in the city core, not beside the player.
  const ci = Math.floor(cols / 2);
  const cj = Math.floor(rows / 2);
  const pi = rural ? ci : lineIndex(xs, px);
  const pj = rural ? cj : lineIndex(zs, pz);
  const spread = rural ? 4 : 7;
  for (let tries = 0; tries < 14; tries += 1) {
    const i = clamp(pi + Math.floor(rng() * (spread * 2 + 1)) - spread, 0, cols - 1);
    const j = clamp(pj + Math.floor(rng() * (spread * 2 + 1)) - spread, 0, rows - 1);
    // Skip fringe cells when player is rural — no traffic jams on village edge
    if (rural) {
      const blk = city.blocks[i * city.config.rows + j];
      if (blk?.fringe) continue;
      if (i <= 0 || j <= 0 || i >= cols - 1 || j >= rows - 1) continue;
    }
    const dir = Math.floor(rng() * 4);
    if (!valid(cols, rows, i + DX[dir], j + DZ[dir])) continue;
    placeAgent(ctx, a, i, j, dir);
    const d = Math.hypot(a.x - px, a.z - pz);
    if (rural) {
      if (d > 90 && d < 220) return;
      continue;
    }
    if (d > 12 && d < 40) return;
    if (d > 55 && d < 175) return;
  }
  placeAgent(ctx, a, clamp(rural ? ci : pi, 0, cols - 1), clamp(rural ? cj : pj, 0, rows - 1), 1);
}

export function junctionValid(cols: number, rows: number, i: number, j: number): boolean {
  return valid(cols, rows, i, j);
}
