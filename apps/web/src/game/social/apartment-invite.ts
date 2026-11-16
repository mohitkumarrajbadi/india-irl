/** Invite nearest peer into the current flat. */
import { apartmentInside, apartmentInvite } from "@/game/apartment";
import { live } from "@/game/runtime";
import { toast } from "@/game/store";
import { useNet, type Peer } from "@/net/store";

function nearestPeer(x: number, z: number, peers: Map<string, Peer>, maxR = 40): Peer | null {
  let best: Peer | null = null;
  let bestD = maxR * maxR;
  peers.forEach((p) => {
    const d = (p.rx - x) ** 2 + (p.rz - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  });
  return best;
}

export function apartmentInviteNearest(): boolean {
  if (!apartmentInside()) return false;
  const near = nearestPeer(live.x, live.z, useNet.getState().peerMap);
  if (!near) {
    toast("No peers nearby to invite");
    return true;
  }
  toast(apartmentInvite(near.id));
  return true;
}
