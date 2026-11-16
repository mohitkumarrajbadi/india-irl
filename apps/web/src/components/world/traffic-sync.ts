/**
 * Interest-scoped traffic authority — lowest peer id hosts nearby fleet snaps.
 * Peds/animals stay local backdrop (see `ambient-lod.ts`).
 */
import type { TrafficSim } from "@/vehicles/traffic";
import { live, runtime } from "@/game/runtime";
import { wrapAngle } from "@/lib/math";
import { packTrafficSpeed, unpackTrafficSpeed } from "@/net/vehicle-claim-wire";
import { sendTraffic } from "@/net/store";
import { ambientLodAt } from "@/world/ambient-lod";

export function isTrafficHost(selfId: string, peerIds: string[]): boolean {
  let min = selfId;
  for (const id of peerIds) if (id < min) min = id;
  return min === selfId;
}

/** Soft-correct local agents toward a host snapshot. */
export function applyTrafficSnapshot(sim: TrafficSim, packed: number[]): void {
  for (let i = 0; i + 4 < packed.length; i += 5) {
    const idx = packed[i]! | 0;
    const a = sim.agents[idx];
    if (!a || a.taken) continue;
    const x = packed[i + 1]!;
    const z = packed[i + 2]!;
    const yaw = packed[i + 3]!;
    const { speed, wrecked } = unpackTrafficSpeed(packed[i + 4]!);
    if (wrecked) {
      a.wrecked = true;
      a.taken = false;
      a.speed = 0;
      a.x = x;
      a.z = z;
      a.yaw = yaw;
      a.appearT = 0;
      continue;
    }
    // Host resumed a wreck — clear local wrecked if we had it.
    if (a.wrecked) {
      a.wrecked = false;
      a.x = x;
      a.z = z;
      a.yaw = yaw;
      a.speed = speed;
      a.appearT = Math.max(a.appearT, 0.35);
      continue;
    }
    const jump2 = (x - a.x) ** 2 + (z - a.z) ** 2;
    if (jump2 > 55 * 55) {
      a.x = x;
      a.z = z;
      a.yaw = yaw;
      a.speed = speed;
      a.appearT = Math.max(a.appearT, 0.45);
      continue;
    }
    const d2 = (a.x - live.x) ** 2 + (a.z - live.z) ** 2;
    const blend = d2 < 35 * 35 ? 0.18 : d2 < 90 * 90 ? 0.45 : 0.85;
    a.x += (x - a.x) * blend;
    a.z += (z - a.z) * blend;
    a.yaw += wrapAngle(yaw - a.yaw) * blend;
    a.speed += (speed - a.speed) * blend;
  }
}

/** Host publishes a compact nearby fleet snapshot (range/cap from region LOD). */
export function publishTrafficSnapshot(sim: TrafficSim): void {
  const city = runtime.city;
  const lod = city
    ? ambientLodAt(city, live.x, live.z)
    : { trafficSyncRange: 140, trafficSyncMax: 24 };
  const range2 = lod.trafficSyncRange * lod.trafficSyncRange;
  const packed: number[] = [];
  for (let i = 0; i < sim.agents.length; i += 1) {
    const a = sim.agents[i]!;
    if (a.taken) continue;
    const d2 = (a.x - live.x) ** 2 + (a.z - live.z) ** 2;
    if (d2 > range2) continue;
    packed.push(
      i,
      Math.round(a.x * 10) / 10,
      Math.round(a.z * 10) / 10,
      Math.round(a.yaw * 100) / 100,
      packTrafficSpeed(a.speed, a.wrecked),
    );
    if (packed.length >= 5 * lod.trafficSyncMax) break;
  }
  sendTraffic(packed);
}
