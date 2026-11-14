/**
 * Optional SharedArrayBuffer snapshot ring (COOP/COEP / crossOriginIsolated).
 * Falls back to transferable Float32Array copies when SAB is unavailable.
 */
import { SNAP_STRIDE } from "./protocol.ts";
import { MAX_ENTITIES } from "./snapshot.ts";

const HEADER = 4; // [tick, count, writeGen, reserved] as Uint32

export type SnapshotChannel = {
  sab: SharedArrayBuffer | null;
  /** Worker: write packed floats into the ring (SAB) or return a transferable copy. */
  publish(tick: number, src: Float32Array, count: number): Float32Array | null;
  /** Main: read latest snapshot from SAB when present. */
  read(): { tick: number; count: number; data: Float32Array } | null;
};

export function createSnapshotChannel(): SnapshotChannel {
  const isolated = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
  const floats = MAX_ENTITIES * SNAP_STRIDE;
  const sab =
    isolated && typeof SharedArrayBuffer !== "undefined"
      ? new SharedArrayBuffer(HEADER * 4 + floats * 4)
      : null;
  const header = sab ? new Uint32Array(sab, 0, HEADER) : null;
  const body = sab ? new Float32Array(sab, HEADER * 4, floats) : null;

  return {
    sab,
    publish(tick, src, count) {
      if (!header || !body) return src.slice(0, count * SNAP_STRIDE);
      const n = Math.min(count, MAX_ENTITIES);
      body.set(src.subarray(0, n * SNAP_STRIDE));
      header[0] = tick >>> 0;
      header[1] = n >>> 0;
      header[2] = (header[2] + 1) >>> 0;
      return null; // main reads SAB; post only metadata
    },
    read() {
      if (!header || !body) return null;
      const tick = header[0];
      const count = header[1];
      return { tick, count, data: body };
    },
  };
}
