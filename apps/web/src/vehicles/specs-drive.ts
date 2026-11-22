import { PLAYER_PHYSICS } from "./physics-props.ts";
import type { VehicleSpec } from "./specs-data";

export type DriveState = {
  x: number;
  z: number;
  yaw: number;
  /** Signed forward speed in m/s. */
  speed: number;
  /** Smoothed steering input, -1 (left) to 1 (right). */
  steer: number;
  /** Roll angle for the model. */
  roll: number;
};

export type DriveInput = {
  throttle: number;
  steer: number;
  boost: boolean;
  handbrake: boolean;
  /** 0…1 chassis health fraction — damaged vehicles underperform. */
  health?: number;
  /** Surface grip multiplier (dirt/gravel/wet). */
  gripMul?: number;
  /** Coast/brake drag multiplier (wet roads). */
  dragMul?: number;
  /** Forward slope (+ uphill) for gravity assist. */
  grade?: number;
};

/** Arcade bicycle model with class grip, coasting drag, and handbrake slide. */
export function stepDrive(s: DriveState, input: DriveInput, spec: VehicleSpec, dt: number): number {
  const phys = PLAYER_PHYSICS[spec.kind as 1 | 2 | 3];
  const health = Math.max(0.25, Math.min(1, input.health ?? 1));
  const grip = phys.grip * (0.55 + health * 0.45) * Math.max(0.45, input.gripMul ?? 1);
  const dragMul = Math.max(0.85, Math.min(1.6, input.dragMul ?? 1));
  const gradeMul = 1 - Math.min(0.28, Math.max(0, input.grade ?? 0) * 0.9);
  const top = phys.maxSpeed * (input.boost ? 1.18 : 1) * (0.7 + health * 0.3) * gradeMul;
  const accel = phys.accelForce * (input.boost ? 1.28 : 1) * (0.55 + health * 0.45) * gradeMul;
  const brake = phys.brakeForce * (0.65 + health * 0.35) * (0.85 + dragMul * 0.15);
  const absSpd = Math.abs(s.speed);

  if (input.handbrake) {
    const d = (brake * 1.35 + absSpd * 0.8) * dt * grip;
    s.speed = s.speed > 0 ? Math.max(0, s.speed - d) : Math.min(0, s.speed + d);
    if (absSpd > 2.5) s.steer += (input.steer - s.steer) * Math.min(1, dt * 11);
  } else if (input.throttle > 0) {
    if (s.speed < -0.15) s.speed += brake * 1.15 * dt;
    else {
      const load = Math.max(0.12, 1 - Math.pow(Math.max(0, s.speed) / top, 1.35));
      s.speed += accel * load * dt * grip;
    }
  } else if (input.throttle < 0) {
    if (s.speed > 0.35) s.speed -= brake * dt;
    else s.speed = Math.max(-spec.reverse, s.speed - accel * 0.5 * dt);
  } else {
    const drag = (0.42 + absSpd * 0.052) * (2 - grip) * dragMul;
    s.speed *= Math.exp(-drag * dt);
    if (absSpd < 0.06) s.speed = 0;
  }
  if (s.speed > top) s.speed -= (9 + (s.speed - top) * 4.5) * dt;

  // Gravity along grade (uphill slows, downhill pulls)
  if (input.grade) {
    const g = Math.max(-0.55, Math.min(0.55, input.grade));
    s.speed -= g * 9.81 * 0.7 * dt;
  }

  const steerRate = input.handbrake && absSpd > 3 ? 11 : 7.6;
  s.steer += (input.steer - s.steer) * Math.min(1, dt * steerRate);
  // Low grip / damage → more understeer; bikes keep sharper turn-in.
  const underBase = input.handbrake ? 7.2 : phys.separableRider ? 8.4 : 9.8;
  const understeer = 1 + absSpd / (underBase * grip);
  const angle = (s.steer * spec.maxSteer * (0.75 + health * 0.25)) / understeer;
  let yawRate = (s.speed * Math.tan(angle)) / spec.wheelBase;
  if (input.handbrake && absSpd > 4) yawRate *= 1.15 + (1.1 - grip) * 0.5;
  // High yawInertia resists snappy spin; low (bike) turns crisply.
  yawRate /= Math.max(0.55, Math.sqrt(phys.yawInertia));
  s.yaw -= yawRate * dt;
  s.x += Math.sin(s.yaw) * s.speed * dt;
  s.z += Math.cos(s.yaw) * s.speed * dt;

  const leanAmt = input.handbrake ? spec.lean * 1.3 : spec.lean;
  const targetRoll = s.steer * Math.min(absSpd / 10.5, 1) * leanAmt;
  s.roll += (targetRoll - s.roll) * Math.min(1, dt * 7);
  return yawRate;
}

export function seatWorld(
  spec: VehicleSpec,
  seat: number,
  x: number,
  z: number,
  yaw: number,
  out: { x: number; y: number; z: number },
): void {
  const s = spec.seats[Math.min(seat, spec.seats.length - 1)];
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  out.x = x + s.x * cos + s.z * sin;
  out.z = z - s.x * sin + s.z * cos;
  out.y = s.y;
}
