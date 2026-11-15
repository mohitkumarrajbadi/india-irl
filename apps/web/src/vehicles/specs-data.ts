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
  radius: number;
  length: number;
  width: number;
  seats: Seat[];
  camDist: number;
  camHeight: number;
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
