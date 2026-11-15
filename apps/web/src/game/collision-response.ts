/**
 * Momentum / angle / location-aware collision response between two vehicles.
 */
import { vehicleHitSeverity } from "./crash.ts";
import { closingAlongNormal, glanceFactor } from "./crash-feel.ts";
import type { PhysicsProps } from "../vehicles/physics-props.ts";

export type HitZone = "front" | "side" | "rear";

export type CollisionOutcome = {
  /** Severity felt by self (0…1). */
  selfSev: number;
  /** Severity felt by other (0…1). */
  otherSev: number;
  /** Signed speed after impact for self. */
  selfSpeed: number;
  /** Yaw kick (rad) for self. */
  selfYawKick: number;
  /** Speed delta applied to other along its forward. */
  otherSpeedDelta: number;
  /** Yaw kick for other. */
  otherYawKick: number;
  zone: HitZone;
  glance: number;
  closing: number;
};

/** Classify impact zone from self yaw vs contact normal (push-out on self). */
export function classifyHitZone(yaw: number, nx: number, nz: number): HitZone {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const inv = 1 / (Math.hypot(nx, nz) || 1);
  // Push-out opposite forward ⇒ hit something ahead; aligned ⇒ rear-ended.
  const along = fx * nx * inv + fz * nz * inv;
  if (along < -0.45) return "front";
  if (along > 0.45) return "rear";
  return "side";
}

function zoneMul(zone: HitZone): number {
  if (zone === "side") return 1.18;
  if (zone === "rear") return 0.82;
  return 1;
}

/**
 * Resolve a two-body smash. Speeds are signed forward (arcade convention).
 * `nx,nz` is the push-out normal on self (away from other).
 */
export function resolveVehicleCollision(args: {
  self: PhysicsProps;
  other: PhysicsProps;
  selfSpeed: number;
  selfYaw: number;
  otherSpeed: number;
  otherYaw: number;
  nx: number;
  nz: number;
}): CollisionOutcome {
  const { self, other, selfSpeed, selfYaw, otherSpeed, otherYaw, nx, nz } = args;
  const closing = closingAlongNormal(selfSpeed, selfYaw, otherSpeed, otherYaw, nx, nz);
  const glance = glanceFactor(selfSpeed, selfYaw, nx, nz);
  const zone = classifyHitZone(selfYaw, nx, nz);
  const zm = zoneMul(zone);

  const selfSev = Math.min(1, vehicleHitSeverity(closing, self.mass, other.mass, glance) * zm);
  const otherSev = Math.min(
    1,
    vehicleHitSeverity(closing, other.mass, self.mass, glance * 0.55) * zm,
  );

  // Momentum transfer along contact — heavy bodies keep more of their speed.
  const inv = 1 / (Math.hypot(nx, nz) || 1);
  const nxx = nx * inv;
  const nzz = nz * inv;
  const m1 = self.mass;
  const m2 = other.mass;
  const sum = m1 + m2;
  const rest = 0.12 + self.rigidity * 0.25 + other.rigidity * 0.2;

  const v1n = Math.sin(selfYaw) * selfSpeed * nxx + Math.cos(selfYaw) * selfSpeed * nzz;
  const v2n = Math.sin(otherYaw) * otherSpeed * nxx + Math.cos(otherYaw) * otherSpeed * nzz;
  // 1D elastic-ish exchange along normal
  const u1 = (v1n * (m1 - m2) + 2 * m2 * v2n) / sum;
  const u2 = (v2n * (m2 - m1) + 2 * m1 * v1n) / sum;
  const dv1 = (u1 - v1n) * rest;
  const dv2 = (u2 - v2n) * rest;

  const selfSpeedOut = selfSpeed + dv1 * (Math.sin(selfYaw) * nxx + Math.cos(selfYaw) * nzz);
  const otherDelta = dv2 * (Math.sin(otherYaw) * nxx + Math.cos(otherYaw) * nzz);

  // Offset / side hits create spin — low yawInertia spins harder.
  const side = Math.cos(selfYaw) * nxx - Math.sin(selfYaw) * nzz;
  const spin = closing * side * (0.035 / Math.max(0.2, self.yawInertia)) * (1 - glance * 0.5);
  const otherSpin =
    -closing * side * (0.028 / Math.max(0.2, other.yawInertia)) * (1 - glance * 0.4);

  return {
    selfSev,
    otherSev,
    selfSpeed: selfSpeedOut,
    selfYawKick: Math.max(-0.85, Math.min(0.85, spin)),
    otherSpeedDelta: otherDelta,
    otherYawKick: Math.max(-0.7, Math.min(0.7, otherSpin)),
    zone,
    glance,
    closing,
  };
}

/** Should separable rider leave the chassis given severity + mass ratio. */
export function shouldSeparateRider(
  self: PhysicsProps,
  otherMass: number,
  severity: number,
  closing: number,
): boolean {
  if (!self.separableRider) return false;
  const ratio = otherMass / (self.mass + otherMass);
  // Light bike vs heavy bus separates earlier than bike vs bike.
  const thresh = 0.58 - ratio * 0.28 - Math.min(0.12, closing / 80);
  return severity >= thresh || (closing >= 9 && ratio >= 0.75);
}

/** Cabin vehicles eject only on extreme hits (unless tiny vs giant). */
export function shouldEjectCabinBody(
  self: PhysicsProps,
  otherMass: number,
  severity: number,
): boolean {
  if (self.separableRider) return false;
  const ratio = otherMass / (self.mass + otherMass);
  const thresh = 0.9 - (ratio > 0.85 ? 0.12 : 0);
  return severity >= thresh;
}
