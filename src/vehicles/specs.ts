/** Player-drivable vehicle kinds. 0 means on foot. Sent over the network as-is. */
export const VK = { none: 0, auto: 1, bike: 2, cab: 3 } as const;
export type VehicleKind = 0 | 1 | 2 | 3;

export type Seat = {
  /** Local space: +Z forward, +X left, y = hip height. */
  x: number;
  y: number;
  z: number;
  /** See SEAT in the rig. */
  pose: number;
};

export type VehicleSpec = {
  kind: VehicleKind;
  name: string;
  blurb: string;
  maxSpeed: number;
  reverse: number;
  accel: number;
  brake: number;
  wheelBase: number;
  maxSteer: number;
  /** Collision radius of the body. */
  radius: number;
  length: number;
  width: number;
  seats: Seat[];
  camDist: number;
  camHeight: number;
  /** Visual lean into corners, 0 for cars. */
  lean: number;
};

export const SPECS: Record<1 | 2 | 3, VehicleSpec> = {
  1: {
    kind: 1,
    name: "Auto-rickshaw",
    blurb: "3 seats. Zippy in traffic. Honk liberally.",
    maxSpeed: 15.5,
    reverse: 3,
    accel: 6.5,
    brake: 15,
    wheelBase: 1.85,
    maxSteer: 0.62,
    radius: 0.95,
    length: 2.6,
    width: 1.35,
    seats: [
      { x: 0, y: 0.78, z: 0.3, pose: 1 },
      { x: 0.28, y: 0.7, z: -0.55, pose: 2 },
      { x: -0.28, y: 0.7, z: -0.55, pose: 2 },
    ],
    camDist: 7.2,
    camHeight: 1.9,
    lean: 0.04,
  },
  2: {
    kind: 2,
    name: "Scooter",
    blurb: "2 seats. Fastest through gaps. Lean into corners.",
    maxSpeed: 21,
    reverse: 2,
    accel: 8.5,
    brake: 16,
    wheelBase: 1.3,
    maxSteer: 0.55,
    radius: 0.55,
    length: 1.9,
    width: 0.7,
    seats: [
      { x: 0, y: 0.82, z: -0.02, pose: 3 },
      { x: 0, y: 0.84, z: -0.58, pose: 4 },
    ],
    camDist: 6.4,
    camHeight: 1.7,
    lean: 0.5,
  },
  3: {
    kind: 3,
    name: "Cab",
    blurb: "4 seats. Quickest on the highway. AC on.",
    maxSpeed: 27,
    reverse: 4,
    accel: 7.5,
    brake: 18,
    wheelBase: 2.5,
    maxSteer: 0.5,
    radius: 1.05,
    length: 4.1,
    width: 1.75,
    seats: [
      { x: -0.4, y: 0.62, z: 0.28, pose: 1 },
      { x: 0.4, y: 0.62, z: 0.28, pose: 2 },
      { x: 0.4, y: 0.62, z: -0.6, pose: 2 },
      { x: -0.4, y: 0.62, z: -0.6, pose: 2 },
    ],
    camDist: 8.6,
    camHeight: 2.2,
    lean: 0.02,
  },
};

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
};

/** Arcade bicycle model with coasting drag, engine curve, and handbrake slide. */
export function stepDrive(s: DriveState, input: DriveInput, spec: VehicleSpec, dt: number): number {
  const top = spec.maxSpeed * (input.boost ? 1.18 : 1);
  const accel = spec.accel * (input.boost ? 1.28 : 1);
  const absSpd = Math.abs(s.speed);

  if (input.handbrake) {
    // Hard brake + slight yaw slide (autos/scooters love this).
    const d = (spec.brake * 1.35 + absSpd * 0.8) * dt;
    s.speed = s.speed > 0 ? Math.max(0, s.speed - d) : Math.min(0, s.speed + d);
    if (absSpd > 2.5) s.steer += (input.steer - s.steer) * Math.min(1, dt * 11);
  } else if (input.throttle > 0) {
    if (s.speed < -0.15) s.speed += spec.brake * 1.15 * dt; // brake-to-forward
    else {
      // Torque falls off near top speed (real gear feel, still arcade).
      const load = Math.max(0.12, 1 - Math.pow(Math.max(0, s.speed) / top, 1.35));
      s.speed += accel * load * dt;
    }
  } else if (input.throttle < 0) {
    if (s.speed > 0.35) s.speed -= spec.brake * dt;
    else s.speed = Math.max(-spec.reverse, s.speed - accel * 0.5 * dt);
  } else {
    // Rolling resistance + aero-ish drag.
    const drag = 0.35 + absSpd * 0.045;
    s.speed *= Math.exp(-drag * dt);
    if (absSpd < 0.06) s.speed = 0;
  }
  if (s.speed > top) s.speed -= (8 + (s.speed - top) * 4) * dt;

  const steerRate = input.handbrake && absSpd > 3 ? 10 : 7.2;
  s.steer += (input.steer - s.steer) * Math.min(1, dt * steerRate);
  const understeer = 1 + absSpd / (input.handbrake ? 7.5 : 10.5);
  const angle = (s.steer * spec.maxSteer) / understeer;
  let yawRate = (s.speed * Math.tan(angle)) / spec.wheelBase;
  if (input.handbrake && absSpd > 4) yawRate *= 1.35; // slide yaw
  // Right steer (positive) turns toward -X when facing +Z, so yaw decreases.
  s.yaw -= yawRate * dt;
  s.x += Math.sin(s.yaw) * s.speed * dt;
  s.z += Math.cos(s.yaw) * s.speed * dt;

  const leanAmt = input.handbrake ? spec.lean * 1.25 : spec.lean;
  const targetRoll = s.steer * Math.min(absSpd / 11, 1) * leanAmt;
  s.roll += (targetRoll - s.roll) * Math.min(1, dt * 6.5);
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
  // Local +X is the vehicle's left, which is (cos, -sin) in world XZ.
  out.x = x + s.x * cos + s.z * sin;
  out.z = z - s.x * sin + s.z * cos;
  out.y = s.y;
}
