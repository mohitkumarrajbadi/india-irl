/** Snapshot entity → arcade DriveState fields (y-up quat). */
import type { SnapshotEntity } from "@india-irl/engine";

export type DrivePose = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  roll: number;
};

export function poseFromSnap(e: SnapshotEntity): DrivePose {
  const { qx, qy, qz, qw } = e;
  const yaw = Math.atan2(2 * (qw * qy + qx * qz), 1 - 2 * (qy * qy + qz * qz));
  const sinr = 2 * (qw * qx + qy * qz);
  const cosr = 1 - 2 * (qx * qx + qy * qy);
  const roll = Math.atan2(sinr, cosr);
  return { x: e.x, z: e.z, yaw, speed: e.speed, roll };
}

export function applyPoseToDrive(
  ds: { x: number; z: number; yaw: number; speed: number; roll: number },
  pose: DrivePose,
): void {
  ds.x = pose.x;
  ds.z = pose.z;
  ds.yaw = pose.yaw;
  ds.speed = pose.speed;
  ds.roll = pose.roll;
}
