/**
 * Phase B SimBridge singleton — local vehicle authority + chunk stream.
 */
import { SimBridge, type SnapshotEntity } from "@india-irl/engine";
import type { VehicleKind } from "@india-irl/shared";
import { LOCAL_DRIVER_ID, LOCAL_VEHICLE_ID } from "./drive-ids";
import { clearChunkStream } from "./chunk-stream";
import { noteDriveImpact } from "./drive-impact";

type Pose = { x: number; y: number; z: number; yaw: number };

let bridge: SimBridge | null = null;
let latest: readonly SnapshotEntity[] = [];
let spawnedKind = 0;
let booting = false;
let pendingMount: { kind: VehicleKind; pose: Pose } | null = null;

export function getDriveBridge(): SimBridge | null {
  return bridge?.ready ? bridge : null;
}

export function getDriveEntities(): readonly SnapshotEntity[] {
  return latest;
}

export function ensureDriveWorker(spawn: Pose): void {
  if (bridge || booting || typeof Worker === "undefined") return;
  booting = true;
  const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
  const b = new SimBridge(worker, {
    onReady: () => {
      b.spawnLocal(LOCAL_DRIVER_ID, spawn.x, spawn.y + 1, spawn.z, spawn.yaw);
      booting = false;
      if (pendingMount) {
        const m = pendingMount;
        pendingMount = null;
        mountDriveVehicle(m.kind, m.pose);
      }
    },
    onSnapshot: (_t, entities) => {
      latest = entities;
    },
    onEvent: (ev) => {
      if (ev.type === "IMPACT") noteDriveImpact(ev.fx, ev.fz, ev.speed);
    },
  });
  bridge = b;
  b.init(9.81);
}

export function mountDriveVehicle(kind: VehicleKind, pose: Pose): void {
  ensureDriveWorker(pose);
  const b = bridge;
  if (!b?.ready) {
    pendingMount = { kind, pose };
    return;
  }
  if (spawnedKind !== kind) {
    b.spawnVehicle({
      id: LOCAL_VEHICLE_ID,
      kind,
      x: pose.x,
      y: pose.y,
      z: pose.z,
      yaw: pose.yaw,
    });
    spawnedKind = kind;
  } else {
    b.syncVehicle(LOCAL_VEHICLE_ID, pose.x, pose.y + 0.45, pose.z, pose.yaw);
  }
  b.enterVehicle(LOCAL_VEHICLE_ID, 0);
  b.setAuthority(LOCAL_VEHICLE_ID, true);
}

export function unmountDriveVehicle(): void {
  pendingMount = null;
  bridge?.exitVehicle();
}

export function syncLocalCharacter(pose: { x: number; y: number; z: number; yaw: number }): void {
  const b = bridge;
  if (!b?.ready) return;
  b.syncLocal(LOCAL_DRIVER_ID, pose.x, pose.y, pose.z, pose.yaw);
}

export function disposeDriveSession(): void {
  pendingMount = null;
  clearChunkStream();
  bridge?.dispose();
  bridge = null;
  latest = [];
  spawnedKind = 0;
  booting = false;
}
