/**
 * Phase B/C façade — vehicle enter / exit / step + world colliders.
 */
import type { DriveState } from "@/vehicles/specs";
import { simInputFromDriveAxes, type FrameAxes } from "@/game/input/frame-intent";
import { runtime } from "@/game/runtime";
import { LOCAL_VEHICLE_ID, isRapierDriveKind } from "./drive-ids";
import { chunkStreamResidentCount, syncWorldChunks } from "./chunk-stream";
import {
  getDriveBridge,
  getDriveEntities,
  mountDriveVehicle,
  syncLocalCharacter,
  unmountDriveVehicle,
} from "./drive-session";
import { isRapierDriveEnabled, isSimCoreEnabled } from "./flags";
import { applyPoseToDrive, poseFromSnap } from "./pose-from-snap";

const HIP = 0.9;

export function rapierDriveActive(kind: number): boolean {
  return isRapierDriveEnabled() && isRapierDriveKind(kind);
}

/** True when Rapier has streamed world AABBs — skip duplicate arcade wall resolve. */
export function driveAuthorityUsesWorldColliders(): boolean {
  return isRapierDriveEnabled() && chunkStreamResidentCount() > 0;
}

export function driveAuthorityEnter(
  kind: 1 | 2 | 3,
  pose: { x: number; z: number; yaw: number; y?: number },
): void {
  if (!rapierDriveActive(kind)) return;
  mountDriveVehicle(kind, {
    x: pose.x,
    y: pose.y ?? 0,
    z: pose.z,
    yaw: pose.yaw,
  });
}

export function driveAuthorityExit(footPose?: { x: number; y: number; z: number; yaw: number }): void {
  if (!isRapierDriveEnabled()) return;
  unmountDriveVehicle();
  if (footPose && isSimCoreEnabled()) {
    syncLocalCharacter({
      x: footPose.x,
      y: footPose.y + HIP,
      z: footPose.z,
      yaw: footPose.yaw,
    });
  }
}

/** @returns true if ds was updated from the sim snapshot (skip stepDrive). */
export function driveAuthorityStep(ds: DriveState, kind: number, axes: FrameAxes): boolean {
  if (!rapierDriveActive(kind)) return false;
  const b = getDriveBridge();
  if (!b) return false;

  const city = runtime.city;
  if (city) syncWorldChunks(b, ds.x, ds.z, city.boxes, city.circles);

  b.setInput(simInputFromDriveAxes({ ...axes, speed: ds.speed }));
  const ent = getDriveEntities().find((e) => e.id === LOCAL_VEHICLE_ID);
  if (!ent) return false;
  applyPoseToDrive(ds, poseFromSnap(ent));
  return true;
}
