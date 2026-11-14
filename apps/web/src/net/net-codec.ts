/**
 * Main-thread codec bridge. Uses a worker when available; sync fallback otherwise.
 */
import {
  decodePose,
  encodePose,
  poseFromBase64,
  poseToBase64,
  type PoseFields,
} from "@india-irl/network";
import type { NetWorkerIn, NetWorkerOut } from "./net.worker";

type Pending = {
  resolve: (v: PoseFields | Uint8Array | null) => void;
};

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function ensureWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./net.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (ev: MessageEvent<NetWorkerOut>) => {
      const msg = ev.data;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.type === "ENCODED") p.resolve(new Uint8Array(msg.bytes));
      else p.resolve(msg.pose);
    };
    worker.onerror = () => {
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

function request<T>(msg: NetWorkerIn, transfer?: Transferable[]): Promise<T | null> {
  const w = ensureWorker();
  if (!w) return Promise.resolve(null);
  return new Promise((resolve) => {
    pending.set(msg.id, { resolve: resolve as Pending["resolve"] });
    w.postMessage(msg, transfer ?? []);
    setTimeout(() => {
      if (pending.delete(msg.id)) resolve(null);
    }, 80);
  });
}

/** Prefer worker encode; sync fallback. Returns base64 for the `sb` wire. */
export async function encodePoseBase64(pose: PoseFields): Promise<string> {
  const id = (seq += 1);
  const bytes = (await request<Uint8Array>({ type: "ENCODE", id, pose })) as Uint8Array | null;
  if (bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  return poseToBase64(pose);
}

export async function decodePoseBase64Async(b64: string): Promise<PoseFields | null> {
  try {
    const raw = atob(b64);
    const u8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) u8[i] = raw.charCodeAt(i);
    const id = (seq += 1);
    const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    const pose = await request<PoseFields>({ type: "DECODE", id, bytes: buf }, [buf]);
    if (pose) return pose;
    return decodePose(u8);
  } catch {
    return poseFromBase64(b64);
  }
}

/** Sync path for hot receive when worker is busy. */
export function decodePoseBase64Sync(b64: string): PoseFields | null {
  return poseFromBase64(b64);
}

export function disposeNetCodec(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}
