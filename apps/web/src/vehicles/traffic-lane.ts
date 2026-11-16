/** Lane-change / overtake helpers for TrafficSim. */
import { DX, DZ, KIND_INFO, type Agent, type Obstacle } from "./traffic-kinds.ts";
import type { CityData } from "../world/types.ts";

function roadAlong(city: CityData, i: number, j: number, dir: number) {
  return dir % 2 === 0 ? city.roadsX[i] : city.roadsZ[j];
}

/** True if something blocks the forward look corridor. */
export function forwardBlocked(
  a: Agent,
  agents: readonly Agent[],
  selfIndex: number,
  obstacles: readonly Obstacle[],
  look: number,
): boolean {
  const info = KIND_INFO[a.kind];
  const sin = Math.sin(a.yaw);
  const cos = Math.cos(a.yaw);
  for (let m = 0; m < agents.length; m += 1) {
    if (m === selfIndex) continue;
    const o = agents[m]!;
    if (o.taken || o.wrecked || o.ghost > 0) continue;
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const along = rx * sin + rz * cos;
    if (along < 0.5 || along > look) continue;
    const lat = rx * cos - rz * sin;
    const oi = KIND_INFO[o.kind];
    if (Math.abs(lat) > (info.wid + oi.wid) * 0.5 + 0.4) continue;
    if (along - (info.len + oi.len) * 0.5 < 4.5) return true;
  }
  for (const o of obstacles) {
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const along = rx * sin + rz * cos;
    if (along < 0 || along > look) continue;
    const lat = rx * cos - rz * sin;
    if (Math.abs(lat) > o.r + info.wid * 0.5 + 0.5) continue;
    if (along - o.r - info.len * 0.5 < 3.5) return true;
  }
  return false;
}

/** Side corridor free for a lane change (dirSign: −1 left / +1 right in local +X). */
export function sideClear(
  a: Agent,
  agents: readonly Agent[],
  selfIndex: number,
  dirSign: number,
): boolean {
  const info = KIND_INFO[a.kind];
  const sin = Math.sin(a.yaw);
  const cos = Math.cos(a.yaw);
  const side = dirSign;
  for (let m = 0; m < agents.length; m += 1) {
    if (m === selfIndex) continue;
    const o = agents[m]!;
    // Wrecked bikes still block overtakes (taken stays skipped — player-driven).
    if (o.taken) continue;
    const rx = o.x - a.x;
    const rz = o.z - a.z;
    const along = rx * sin + rz * cos;
    if (along < -2 || along > 10) continue;
    const lat = rx * cos - rz * sin;
    if (lat * side < 0.4) continue;
    if (Math.abs(lat) < (info.wid + KIND_INFO[o.kind].wid) * 0.55 + 1.2) return false;
  }
  return true;
}

export type LaneChange = { lane: number; strafe: number; blinker: -1 | 0 | 1 };

/**
 * Pick an adjacent lane for overtake, or null.
 * Strafe / blinker derived from lane offset delta: more positive offset = local +X = right
 * (works for LHT all-negative arterials and bipolar test lanes).
 */
export function pickLaneChange(
  city: CityData,
  a: Agent,
  agents: readonly Agent[],
  selfIndex: number,
  obstacles: readonly Obstacle[],
): LaneChange | null {
  if (a.laneTimer > 0 || a.kind >= 3) return null;
  if (!forwardBlocked(a, agents, selfIndex, obstacles, 8 + a.speed)) return null;
  const travel = a.stage === 0 ? a.approachDir : a.dir;
  const bi = a.ni - DX[travel]!;
  const bj = a.nj - DZ[travel]!;
  const road = roadAlong(city, bi, bj, travel);
  const lanes = road.lanes.length > 0 ? road.lanes : roadAlong(city, a.ni, a.nj, a.dir).lanes;
  if (lanes.length < 2) return null;

  const curOff = lanes[Math.min(a.lane, lanes.length - 1)]!;
  type Cand = { lane: number; dOff: number };
  const cands: Cand[] = [];
  for (const next of [a.lane - 1, a.lane + 1]) {
    if (next < 0 || next >= lanes.length) continue;
    cands.push({ lane: next, dOff: lanes[next]! - curOff });
  }
  // Prefer overtaking to the right (positive offset delta / local +X) — India LHT.
  cands.sort((a, b) => b.dOff - a.dOff);

  for (const c of cands) {
    const strafe = c.dOff >= 0 ? 1 : -1;
    const blinker = (strafe > 0 ? 1 : -1) as -1 | 1;
    if (!sideClear(a, agents, selfIndex, strafe)) continue;
    return { lane: c.lane, strafe, blinker };
  }
  return null;
}
