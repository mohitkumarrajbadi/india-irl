/**
 * Lightweight convoy — invite / join / leave / regroup.
 * Marker points at host (or meet) for members; host can regroup everyone.
 * Wire: { t: "cv", op, to?, x?, z?, label? }
 */
export type ConvoyOp = "invite" | "join" | "leave" | "regroup" | "marker";

export type ConvoyMarker = { x: number; z: number; label: string };

export type ConvoyState = {
  /** Local player is host when hostId === selfId. */
  hostId: string | null;
  members: Set<string>;
  marker: ConvoyMarker | null;
  /** Pending invite from peer. */
  pendingFrom: string | null;
};

const state: ConvoyState = {
  hostId: null,
  members: new Set(),
  marker: null,
  pendingFrom: null,
};

type Sender = ((msg: { t: string } & Record<string, unknown>) => void) | null;
let sendRaw: Sender = null;
let selfId = "";

export function setConvoySender(fn: Sender, id: string): void {
  sendRaw = fn;
  selfId = id;
}

export function convoyState(): ConvoyState {
  return state;
}

export function convoyActive(): boolean {
  return state.hostId != null;
}

export function convoyIsHost(): boolean {
  return state.hostId != null && state.hostId === selfId;
}

export function resetConvoy(): void {
  state.hostId = null;
  state.members.clear();
  state.marker = null;
  state.pendingFrom = null;
}

/** Host invites a peer; or accept pending; or leave. */
export function convoyInvite(peerId: string): string {
  if (!peerId || peerId === selfId) return "No one nearby";
  if (state.pendingFrom === peerId) {
    acceptInvite(peerId);
    return "Joined convoy";
  }
  if (state.hostId && state.hostId !== selfId) return "Already in a convoy — leave first";
  if (!state.hostId) {
    state.hostId = selfId;
    state.members.clear();
    state.members.add(selfId);
  }
  sendRaw?.({ t: "cv", op: "invite", to: peerId });
  return "Convoy invite sent";
}

export function convoyLeave(): string {
  if (!state.hostId) return "Not in a convoy";
  sendRaw?.({ t: "cv", op: "leave" });
  resetConvoy();
  return "Left convoy";
}

/** Host: set regroup marker at world pose and broadcast. */
export function convoyRegroup(x: number, z: number, label = "Regroup"): string {
  if (!convoyIsHost()) return "Only the convoy host can regroup";
  state.marker = { x, z, label };
  sendRaw?.({ t: "cv", op: "regroup", x, z, label });
  return `Regroup · ${label}`;
}

export function convoySetMarker(x: number, z: number, label: string): void {
  state.marker = { x, z, label };
  if (convoyIsHost()) sendRaw?.({ t: "cv", op: "marker", x, z, label });
}

export function applyConvoyMessage(msg: Record<string, unknown>, fromId: string): string | null {
  const op = msg.op;
  if (op === "invite") {
    const to = typeof msg.to === "string" ? msg.to : "";
    if (to !== selfId) return null;
    state.pendingFrom = fromId;
    return `Convoy invite from peer · press C near them`;
  }
  if (op === "join") {
    if (!convoyIsHost()) return null;
    state.members.add(fromId);
    if (state.marker) {
      sendRaw?.({
        t: "cv",
        op: "marker",
        to: fromId,
        x: state.marker.x,
        z: state.marker.z,
        label: state.marker.label,
      });
    }
    return "Peer joined convoy";
  }
  if (op === "leave") {
    state.members.delete(fromId);
    if (state.hostId === fromId) {
      resetConvoy();
      return "Convoy host left";
    }
    return null;
  }
  if (op === "regroup" || op === "marker") {
    const to = typeof msg.to === "string" ? msg.to : "";
    if (to && to !== selfId) return null;
    const x = Number(msg.x);
    const z = Number(msg.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    if (!state.hostId) {
      state.hostId = fromId;
      state.members.add(selfId);
      state.members.add(fromId);
    }
    state.marker = {
      x,
      z,
      label: typeof msg.label === "string" ? msg.label.slice(0, 32) : "Meet up",
    };
    return op === "regroup" ? `Regroup · ${state.marker.label}` : null;
  }
  return null;
}

function acceptInvite(hostId: string): void {
  state.hostId = hostId;
  state.members.clear();
  state.members.add(selfId);
  state.members.add(hostId);
  state.pendingFrom = null;
  sendRaw?.({ t: "cv", op: "join", to: hostId });
}

/** Bearing degrees from player yaw toward marker (0 = ahead). */
export function convoyMarkerBearing(
  px: number,
  pz: number,
  yaw: number,
): { dist: number; bearingDeg: number; label: string } | null {
  const m = state.marker;
  if (!m) return null;
  const dx = m.x - px;
  const dz = m.z - pz;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  let bearing = ((want - yaw) * 180) / Math.PI;
  while (bearing > 180) bearing -= 360;
  while (bearing < -180) bearing += 360;
  return { dist, bearingDeg: bearing, label: m.label };
}
