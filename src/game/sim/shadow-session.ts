/**
 * Owns SimBridge lifecycle for Phase A shadow mode.
 * Spawns one ghost auto; does not drive gameplay transforms.
 */
import { SimBridge, type SnapshotEntity } from "@india-irl/engine";
import { VK } from "@india-irl/shared";
import { SHADOW_AUTO_ID, SHADOW_LOCAL_ID } from "./ids";

export type ShadowSession = {
  bridge: SimBridge;
  dispose: () => void;
};

let latest: readonly SnapshotEntity[] = [];

export function getShadowEntities(): readonly SnapshotEntity[] {
  return latest;
}

export function startShadowSession(spawn: {
  x: number;
  y: number;
  z: number;
  yaw: number;
}): ShadowSession | null {
  if (typeof Worker === "undefined") return null;

  const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
  const bridge = new SimBridge(worker, {
    onReady: () => {
      bridge.spawnLocal(SHADOW_LOCAL_ID, spawn.x, spawn.y + 1, spawn.z, spawn.yaw);
      bridge.spawnVehicle({
        id: SHADOW_AUTO_ID,
        kind: VK.auto,
        x: spawn.x + 4,
        y: spawn.y,
        z: spawn.z,
        yaw: spawn.yaw,
      });
      bridge.enterVehicle(SHADOW_AUTO_ID, 0);
      bridge.setAuthority(SHADOW_AUTO_ID, true);
    },
    onSnapshot: (_tick, entities) => {
      latest = entities;
    },
    onEvent: (ev) => {
      if (ev.type === "IMPACT" || ev.type === "RAGDOLL") {
        console.debug("[shadow-sim]", ev);
      }
    },
  });
  bridge.init(9.81);

  return {
    bridge,
    dispose: () => {
      latest = [];
      bridge.dispose();
    },
  };
}
