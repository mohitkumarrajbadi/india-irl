/** Key C — invite nearest peer / accept / regroup (host) / leave (shift handled by caller). */
import { live } from "@/game/runtime";
import { toast } from "@/game/store";
import { useNet, type Peer } from "@/net/store";
import {
  convoyInvite,
  convoyIsHost,
  convoyLeave,
  convoyRegroup,
  convoySetMarker,
  convoyState,
} from "./convoy.ts";

function nearestPeer(x: number, z: number, peers: Map<string, Peer>, maxR = 28): Peer | null {
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

export function convoyKeyAction(leave = false): void {
  if (leave) {
    toast(convoyLeave());
    return;
  }
  const { peerMap } = useNet.getState();
  const pending = convoyState().pendingFrom;
  if (pending && peerMap.has(pending)) {
    toast(convoyInvite(pending));
    return;
  }
  if (convoyIsHost()) {
    toast(convoyRegroup(live.x, live.z, "Here"));
    return;
  }
  const near = nearestPeer(live.x, live.z, peerMap);
  if (!near) {
    toast("No peers nearby for convoy");
    return;
  }
  toast(convoyInvite(near.id));
}

/** Point convoy marker at active meet plaza. */
export function convoyMarkMeet(x: number, z: number, label: string): void {
  if (!convoyState().hostId) return;
  convoySetMarker(x, z, label);
  toast(`Route · ${label}`);
}
