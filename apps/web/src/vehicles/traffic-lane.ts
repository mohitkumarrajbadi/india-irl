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
    const o = agents[m];
    if (o.taken || o.ghost > 0) continue;
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
  const side = dirSign; // local +X
  for (let m = 0; m < agents.length; m += 1) {
    if (m === selfIndex) continue;
    const o = agents[m];
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

/** Pick an adjacent lane for overtake, or null. */
export function pickLaneChange(
  city: CityData,
  a: Agent,
  agents: readonly Agent[],
  selfIndex: number,
  obstacles: readonly Obstacle[],
): LaneChange | null {
  if (a.laneTimer > 0 || a.kind >= 3) return null; // buses/trucks stay put
  if (!forwardBlocked(a, agents, selfIndex, obstacles, 8 + a.speed)) return null;
  const travel = a.stage === 0 ? a.approachDir : a.dir;
  const bi = a.ni - DX[travel];
  const bj = a.nj - DZ[travel];
  const road = roadAlong(city, bi, bj, travel);
  const lanes = road.lanes.length > 0 ? road.lanes : roadAlong(city, a.ni, a.nj, a.dir).lanes;
  if (lanes.length < 2) return null;

  const tryLane = (next: number, blinker: -1 | 0 | 1, strafe: number): LaneChange | null => {
    if (next < 0 || next >= lanes.length) return null;
    if (!sideClear(a, agents, selfIndex, strafe)) return null;
    return { lane: next, strafe, blinker };
  };

  // Prefer overtaking to the right in India (keep-left traffic → pass on right).
  return (
    tryLane(a.lane + 1, 1, -1) ||
    tryLane(a.lane - 1, -1, 1) ||
    null
  );
}
