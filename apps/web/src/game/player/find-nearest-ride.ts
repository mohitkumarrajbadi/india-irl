import type { Peer } from "@/net/store";
import { freeSeat } from "./free-seat.ts";

export function findNearestRide(x: number, z: number, peers: Map<string, Peer>): Peer | null {
  let best: Peer | null = null;
  let bestD = 4.6 * 4.6;
  peers.forEach((p) => {
    if (p.veh === 0 || p.passenger || p.snaps.length === 0) return;
    const d = (p.rx - x) ** 2 + (p.rz - z) ** 2;
    if (d < bestD && freeSeat(p, peers) >= 0) {
      bestD = d;
      best = p;
    }
  });
  return best;
}
