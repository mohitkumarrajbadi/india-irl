import { SNAP_STRIDE } from "./protocol.ts";
import { MAX_ENTITIES } from "./snapshot.ts";

export type LoopState = {
  tick: number;
  acc: number;
  lastNow: number;
  raf: number;
  snapBuf: Float32Array;
};

export function createLoopState(): LoopState {
  return {
    tick: 0,
    acc: 0,
    lastNow: 0,
    raf: 0,
    snapBuf: new Float32Array(MAX_ENTITIES * SNAP_STRIDE),
  };
}
