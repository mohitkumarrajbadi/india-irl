/** Unified nearest enterable vehicle: world parked + ambient traffic. */
import { trafficDrive } from "../vehicles/drive-catalog.ts";
import {
  KIND_INFO,
  TRAFFIC_NAMES,
  type Agent,
  type TrafficKind,
} from "../vehicles/traffic-kinds.ts";
import type { CityData } from "../world/types.ts";
import { findNearestWorldParked, type WorldParkedHit } from "./world-vehicles.ts";

/** Map traffic mesh → player drive archetype (auto / bike / car-family). */
export function trafficKindToVehicle(kind: TrafficKind): 1 | 2 | 3 {
  return trafficDrive(kind).archetype;
}

export function trafficKindLabel(kind: TrafficKind): string {
  return TRAFFIC_NAMES[kind] ?? "Vehicle";
}

export type EnterableHit =
  | ({ source: "parked" } & WorldParkedHit)
  | {
      source: "traffic";
      index: number;
      kind: 1 | 2 | 3;
      x: number;
      z: number;
      yaw: number;
      trafficKind: TrafficKind;
    };

/** Reach matches parked curb (≈18 m) but stays tight to chassis length. */
function enterRadius(halfLen: number): number {
  return Math.min(18, Math.max(7, halfLen + 3.2));
}

export function findNearestTraffic(
  x: number,
  z: number,
  agents: readonly Agent[],
): Extract<EnterableHit, { source: "traffic" }> | null {
  let best: Extract<EnterableHit, { source: "traffic" }> | null = null;
  let bestD = Infinity;
  for (let i = 0; i < agents.length; i += 1) {
    const a = agents[i];
    if (a.taken) continue;
    const info = KIND_INFO[a.kind];
    const r = enterRadius(info.len * 0.5);
    const d = (a.x - x) ** 2 + (a.z - z) ** 2;
    if (d >= r * r || d >= bestD) continue;
    bestD = d;
    best = {
      source: "traffic",
      index: i,
      kind: trafficKindToVehicle(a.kind),
      x: a.x,
      z: a.z,
      yaw: a.yaw,
      trafficKind: a.kind,
    };
  }
  return best;
}

/** Prefer closer target among parked curb slots and live traffic. */
export function findNearestEnterable(
  x: number,
  z: number,
  city: CityData,
  agents: readonly Agent[] | null,
): EnterableHit | null {
  const parked = findNearestWorldParked(x, z, city);
  const traffic = agents ? findNearestTraffic(x, z, agents) : null;
  if (!parked) return traffic;
  if (!traffic) return { source: "parked", ...parked };
  const pd = (parked.x - x) ** 2 + (parked.z - z) ** 2;
  const td = (traffic.x - x) ** 2 + (traffic.z - z) ** 2;
  return pd <= td ? { source: "parked", ...parked } : traffic;
}
