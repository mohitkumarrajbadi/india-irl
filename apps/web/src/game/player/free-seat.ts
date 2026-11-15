import type { Peer } from "@/net/store";
import { SPECS } from "@/vehicles/specs";

export function freeSeat(driver: Peer, peers: Map<string, Peer>): number {
  const spec = SPECS[driver.veh as 1 | 2 | 3];
  if (!spec) return -1;
  const used = new Set<number>([0]);
  peers.forEach((p) => {
    if (p.rideWith === driver.id) used.add(p.seat);
  });
  for (let i = 1; i < spec.seats.length; i += 1) if (!used.has(i)) return i;
  return -1;
}
