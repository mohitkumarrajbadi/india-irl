/**
 * Net codec worker — encode/decode only (relay WebSocket stays on main).
 */
/// <reference lib="webworker" />

import { decodePose, encodePose, type PoseFields } from "@india-irl/network";

export type NetWorkerIn =
  | { type: "ENCODE"; id: number; pose: PoseFields }
  | { type: "DECODE"; id: number; bytes: ArrayBuffer };

export type NetWorkerOut =
  | { type: "ENCODED"; id: number; bytes: ArrayBuffer }
  | { type: "DECODED"; id: number; pose: PoseFields | null };

const scope = self as DedicatedWorkerGlobalScope;

scope.onmessage = (ev: MessageEvent<NetWorkerIn>) => {
  const msg = ev.data;
  if (msg.type === "ENCODE") {
    const bytes = encodePose(msg.pose).slice().buffer;
    const out: NetWorkerOut = { type: "ENCODED", id: msg.id, bytes };
    scope.postMessage(out, [bytes]);
    return;
  }
  if (msg.type === "DECODE") {
    const out: NetWorkerOut = { type: "DECODED", id: msg.id, pose: decodePose(msg.bytes) };
    scope.postMessage(out);
  }
};
