/**
 * Next-bundled worker entry. Reuses package router (docs/LLD-engine.md).
 */
/// <reference lib="webworker" />

import RAPIER from "@dimforge/rapier3d-compat";
import type { MainToSim, SimToMain } from "@india-irl/engine/physics/protocol.ts";
import { createRuntime, handleInit, handleMessage } from "@india-irl/engine/physics/sim-handlers.ts";

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
