/**
 * Simulation worker entry — message router only.
 * Physics lives in sibling modules (see docs/LLD-engine.md).
 */
/// <reference lib="webworker" />

import RAPIER from "@dimforge/rapier3d-compat";
import type { MainToSim, SimToMain } from "./protocol.ts";
import { createRuntime, handleInit, handleMessage } from "./sim-handlers.ts";

const scope = self as DedicatedWorkerGlobalScope;

function post(msg: SimToMain, transfer?: Transferable[]): void {
  scope.postMessage(msg, transfer ?? []);
}

const rt = createRuntime(post);

scope.onmessage = (ev: MessageEvent<MainToSim>) => {
  const msg = ev.data;
  if (msg.type === "INIT") {
    void handleInit(rt, RAPIER, msg.gravity);
    return;
  }
  handleMessage(rt, msg);
};
