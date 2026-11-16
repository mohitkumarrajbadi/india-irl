/**
 * Shared parked / traffic vehicle claim state across peers.
 * Wire: { t: "cl", k: "p"|"t", i: index, free?: 1, w?: 1, x?, z?, yaw? }
 */
import { runtime } from "@/game/runtime";
import { claimWorldParked, parkedVisuals, releaseWorldParked } from "@/game/world-vehicles";
import type { CityData } from "@/world/types";
import {
  applyTrafficClaimFree,
  buildClaimMessage,
  type ClaimFreeExtra,
} from "./vehicle-claim-wire.ts";

export type ClaimKind = "p" | "t";

type Sender = ((msg: { t: string } & Record<string, unknown>) => void) | null;
let sendRaw: Sender = null;
let cityRef: CityData | null = null;

/** Peer id → claim key (`p:12` / `t:3`) they currently hold. */
const peerClaims = new Map<string, string>();

export function setClaimSender(fn: Sender): void {
  sendRaw = fn;
}

export function setClaimCity(city: CityData | null): void {
  cityRef = city;
  peerClaims.clear();
}

function key(k: ClaimKind, i: number): string {
  return `${k}:${i}`;
}

export function broadcastClaim(
  kind: ClaimKind,
  index: number,
  free = false,
  extra?: ClaimFreeExtra,
): void {
  sendRaw?.(buildClaimMessage(kind, index, free, extra));
}

/** Apply a remote claim / free. */
export function applyClaimMessage(msg: Record<string, unknown>, fromId: string): void {
  const kind = msg.k === "t" ? "t" : msg.k === "p" ? "p" : null;
  const index = Number(msg.i);
  if (!kind || !Number.isFinite(index) || index < 0) return;
  const free = Number(msg.free) === 1;
  const k = key(kind, index | 0);

  if (free) {
    if (peerClaims.get(fromId) === k) peerClaims.delete(fromId);
    releaseLocal(kind, index | 0, msg);
    return;
  }

  const prev = peerClaims.get(fromId);
  if (prev && prev !== k) {
    const [pk, pi] = prev.split(":");
    releaseLocal(pk as ClaimKind, Number(pi));
  }
  peerClaims.set(fromId, k);
  takeLocal(kind, index | 0);
}

function takeLocal(kind: ClaimKind, index: number): void {
  if (kind === "p") {
    if (!cityRef || parkedVisuals.claimed.has(index)) return;
    claimWorldParked(cityRef, index);
    return;
  }
  const a = runtime.traffic?.agents[index];
  if (a) {
    a.taken = true;
    a.wrecked = false;
    a.speed = 0;
  }
}

function releaseLocal(kind: ClaimKind, index: number, msg?: Record<string, unknown>): void {
  if (kind === "p") {
    if (!cityRef || !parkedVisuals.claimed.has(index)) return;
    const p = cityRef.parked[index];
    releaseWorldParked(cityRef, index, {
      x: p?.x ?? 0,
      z: p?.z ?? 0,
      yaw: p?.rot ?? 0,
    });
    return;
  }
  const a = runtime.traffic?.agents[index];
  if (a) applyTrafficClaimFree(a, msg ?? { free: 1 });
}

/** When a peer leaves, free whatever they claimed. */
export function releaseClaimsForPeer(peerId: string): void {
  const prev = peerClaims.get(peerId);
  if (!prev) return;
  peerClaims.delete(peerId);
  const [pk, pi] = prev.split(":");
  releaseLocal(pk as ClaimKind, Number(pi));
}
