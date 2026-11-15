import type { TrafficSim } from "@/vehicles/traffic";
import { live } from "@/game/runtime";
import { sendTraffic } from "@/net/store";

export function isTrafficHost(selfId: string, peerIds: string[]): boolean {
  let min = selfId;
  for (const id of peerIds) if (id < min) min = id;
  return min === selfId;
}

/** Soft-correct local agents toward a host snapshot. */
export function applyTrafficSnapshot(sim: TrafficSim, packed: number[]): void {
  for (let i = 0; i + 4 < packed.length; i += 5) {
    const idx = packed[i] | 0;
    const a = sim.agents[idx];
    if (!a || a.taken) continue;
    const x = packed[i + 1];
    const z = packed[i + 2];
    const yaw = packed[i + 3];
    const speed = packed[i + 4];
    const d2 = (a.x - live.x) ** 2 + (a.z - live.z) ** 2;
    const blend = d2 < 35 * 35 ? 0.18 : d2 < 90 * 90 ? 0.45 : 0.85;
    a.x += (x - a.x) * blend;
    a.z += (z - a.z) * blend;
    a.yaw += (yaw - a.yaw) * blend;
    a.speed += (speed - a.speed) * blend;
  }
}

/** Host publishes a compact nearby fleet snapshot. */
export function publishTrafficSnapshot(sim: TrafficSim): void {
  const packed: number[] = [];
  for (let i = 0; i < sim.agents.length; i += 1) {
    const a = sim.agents[i];
    if (a.taken) continue;
    const d2 = (a.x - live.x) ** 2 + (a.z - live.z) ** 2;
    if (d2 > 140 * 140) continue;
    packed.push(
      i,
      Math.round(a.x * 10) / 10,
      Math.round(a.z * 10) / 10,
      Math.round(a.yaw * 100) / 100,
      Math.round(a.speed * 10) / 10,
    );
    if (packed.length >= 5 * 24) break;
  }
  sendTraffic(packed);
}
