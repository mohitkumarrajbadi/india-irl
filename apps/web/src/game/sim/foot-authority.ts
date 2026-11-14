/**
 * Phase C foot: Rapier kinematic character → local player pose.
 */
import { runtime } from "@/game/runtime";
import { simInputFromFootAxes, type FootAxes } from "@/game/input/foot-intent";
import { LOCAL_DRIVER_ID } from "./drive-ids";
import { chunkStreamResidentCount, syncWorldChunks } from "./chunk-stream";
import { ensureDriveWorker, getDriveBridge, getDriveEntities } from "./drive-session";
import { isSimCoreEnabled } from "./flags";
import { poseFromSnap } from "./pose-from-snap";

/** Capsule center → arcade foot height. */
const HIP = 0.9;

let prevX = 0;
let prevZ = 0;
let havePrev = false;

export type FootPoseTarget = {
  x: number;
  z: number;
  y: number;
  facing: number;
  speed: number;
  actual: number;
};

export function footAuthorityActive(): boolean {
  return isSimCoreEnabled();
}

export function footAuthorityUsesWorldColliders(): boolean {
  return footAuthorityActive() && chunkStreamResidentCount() > 0;
}

export function footAuthoritySync(pose: { x: number; y: number; z: number; yaw: number }): void {
  if (!footAuthorityActive()) return;
  ensureDriveWorker(pose);
  const b = getDriveBridge();
  if (!b) return;
  b.syncLocal(LOCAL_DRIVER_ID, pose.x, pose.y + HIP, pose.z, pose.yaw);
  havePrev = false;
}

/** @returns true if `out` was filled from the sim snapshot. */
export function footAuthorityStep(out: FootPoseTarget, axes: FootAxes, dt: number): boolean {
  if (!footAuthorityActive()) return false;
  const b = getDriveBridge();
  if (!b) return false;

  const city = runtime.city;
  if (city) syncWorldChunks(b, out.x, out.z, city.boxes, city.circles);

  b.setInput(simInputFromFootAxes(axes));
  const ent = getDriveEntities().find((e) => e.id === LOCAL_DRIVER_ID);
  if (!ent) return false;

  const pose = poseFromSnap(ent);
  out.x = pose.x;
  out.z = pose.z;
  out.y = Math.max(0, ent.y - HIP);
  out.facing = pose.yaw;
  if (havePrev && dt > 1e-4) {
    out.actual = Math.hypot(out.x - prevX, out.z - prevZ) / dt;
    out.speed = out.actual;
  } else {
    out.actual = 0;
    out.speed = 0;
  }
  prevX = out.x;
  prevZ = out.z;
  havePrev = true;
  return true;
}
