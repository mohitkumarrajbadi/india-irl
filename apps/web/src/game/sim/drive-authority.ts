/**
 * Phase B/C façade — vehicle enter / exit / step + world colliders.
 * Interpolation applied here (main thread); CCD lives in sim-spawn (worker).
 */
import type { DriveState } from "@/vehicles/specs";
import { simInputFromDriveAxes, type FrameAxes } from "@/game/input/frame-intent";
import { runtime } from "@/game/runtime";
import { LOCAL_VEHICLE_ID, isRapierDriveKind } from "./drive-ids";
import { regionAt } from "@/world/terrain-sample";
import { collisionResidentCount, syncCollisionChunks } from "./collision-manager";
import {
  getDriveBridge,
  getDriveEntities,
  mountDriveVehicle,
  syncLocalCharacter,
  unmountDriveVehicle,
} from "./drive-session";
import { isRapierDriveEnabled, isSimCoreEnabled } from "./flags";
import { applyPoseToDrive, poseFromSnap } from "./pose-from-snap";
import { pushDriveSample, sampleDrivePose } from "./pose-interp";

const HIP = 0.9;

export function rapierDriveActive(kind: number): boolean {
  return isRapierDriveEnabled() && isRapierDriveKind(kind);
}

/** True when Rapier has streamed world colliders — skip duplicate arcade wall resolve. */
export function driveAuthorityUsesWorldColliders(): boolean {
  return isRapierDriveEnabled() && collisionResidentCount() > 0;
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
  if (city) {
    const region = regionAt(city, ds.x, ds.z);
    syncCollisionChunks(b, city, ds.x, ds.z, ds.speed, region);
  }

  b.setInput(simInputFromDriveAxes({ ...axes, speed: ds.speed, gripMul: axes.gripMul ?? 1 }));
  const ent = getDriveEntities().find((e) => e.id === LOCAL_VEHICLE_ID);
  if (!ent) return false;
  // Interpolation: buffer worker snaps, sample ~1 tick behind for jitter-free mesh motion.
  pushDriveSample(poseFromSnap(ent));
  const smooth = sampleDrivePose() ?? poseFromSnap(ent);
  applyPoseToDrive(ds, smooth);
  return true;
}
