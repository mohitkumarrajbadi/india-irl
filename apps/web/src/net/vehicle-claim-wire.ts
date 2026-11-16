/**
 * Claim/free wire extras — wreck pose so peers freeze the same chassis.
 * Wire: { t:"cl", k, i, free?, w?, x?, z?, yaw? }
 */

export type ClaimFreeExtra = {
  /** Leave chassis as remountable wreck (AI off, visible). */
  wreck?: boolean;
  x?: number;
  z?: number;
  yaw?: number;
};

export type ClaimWirePayload = {
  t: "cl";
  k: "p" | "t";
  i: number;
  free?: 0 | 1;
  w?: 0 | 1;
  x?: number;
  z?: number;
  yaw?: number;
};

export function buildClaimMessage(
  kind: "p" | "t",
  index: number,
  free: boolean,
  extra?: ClaimFreeExtra,
): ClaimWirePayload {
  const msg: ClaimWirePayload = {
    t: "cl",
    k: kind,
    i: index | 0,
    free: free ? 1 : 0,
  };
  if (free && extra?.wreck) {
    msg.w = 1;
    if (Number.isFinite(extra.x)) msg.x = Math.round((extra.x as number) * 10) / 10;
    if (Number.isFinite(extra.z)) msg.z = Math.round((extra.z as number) * 10) / 10;
    if (Number.isFinite(extra.yaw)) msg.yaw = Math.round((extra.yaw as number) * 100) / 100;
  }
  return msg;
}

export type TrafficAgentLike = {
  taken: boolean;
  wrecked: boolean;
  speed: number;
  x: number;
  z: number;
  yaw: number;
  appearT: number;
};

/** Apply free (+optional wreck) to a traffic agent. */
export function applyTrafficClaimFree(a: TrafficAgentLike, msg: Record<string, unknown>): void {
  a.taken = false;
  if (Number(msg.w) === 1) {
    a.wrecked = true;
    a.speed = 0;
    a.appearT = 0;
    if (Number.isFinite(Number(msg.x))) a.x = Number(msg.x);
    if (Number.isFinite(Number(msg.z))) a.z = Number(msg.z);
    if (Number.isFinite(Number(msg.yaw))) a.yaw = Number(msg.yaw);
    return;
  }
  a.wrecked = false;
  a.speed = 0;
}

/** Pack speed for host snapshot: −1 marks wrecked (pose still sent). */
export function packTrafficSpeed(speed: number, wrecked: boolean): number {
  return wrecked ? -1 : Math.round(speed * 10) / 10;
}

export function unpackTrafficSpeed(packed: number): { speed: number; wrecked: boolean } {
  if (packed < 0) return { speed: 0, wrecked: true };
  return { speed: packed, wrecked: false };
}
