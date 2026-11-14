/**
 * Main-thread snapshot interpolation — render smooth @ display Hz,
 * physics authoritative @ 60 Hz in the worker.
 * Applied in driveAuthorityStep (see collision-manager / drive-authority).
 */
import { lerpPose, type PoseSample } from "@india-irl/engine/physics/pose-lerp.ts";
import type { DrivePose } from "./pose-from-snap";

/** Delay behind latest snap (~1 physics tick) to always have a segment. */
const BEHIND_MS = 18;

let prev: PoseSample | null = null;
let next: PoseSample | null = null;

export function resetPoseInterp(): void {
  prev = null;
  next = null;
}

export function pushDriveSample(pose: DrivePose & { y?: number }, at = performance.now()): void {
  const yaw = pose.yaw;
  const sample: PoseSample = {
    x: pose.x,
    y: pose.y ?? 0,
    z: pose.z,
    qx: 0,
    qy: Math.sin(yaw * 0.5),
    qz: 0,
    qw: Math.cos(yaw * 0.5),
    speed: pose.speed,
    yaw,
    roll: pose.roll,
    at,
  };
  if (!next) {
    prev = sample;
    next = sample;
    return;
  }
  prev = next;
  next = sample;
}

/** Sample interpolated drive pose for the current frame. */
export function sampleDrivePose(now = performance.now()): DrivePose | null {
  if (!prev || !next) return null;
  const target = now - BEHIND_MS;
  if (target <= prev.at) {
    return { x: prev.x, z: prev.z, yaw: prev.yaw, speed: prev.speed, roll: prev.roll };
  }
  if (target >= next.at || next.at <= prev.at) {
    return { x: next.x, z: next.z, yaw: next.yaw, speed: next.speed, roll: next.roll };
  }
  const t = (target - prev.at) / (next.at - prev.at);
  const p = lerpPose(prev, next, t);
  return { x: p.x, z: p.z, yaw: p.yaw, speed: p.speed, roll: p.roll };
}
