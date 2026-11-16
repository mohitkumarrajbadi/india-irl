/**
 * Drive catalog — every world chassis maps to handling + a Rapier/net archetype.
 * Archetype stays 1|2|3 for wire + worker tuning; catalog id carries visuals/name.
 */
import { TRAFFIC_NAMES, type TrafficKind } from "./traffic-kinds.ts";
import { SPECS, type Seat, type VehicleKind, type VehicleSpec } from "./specs-data.ts";

/** Stable chassis families used by Rapier / peer vehicle byte. */
export type DriveArchetype = 1 | 2 | 3;

export type CatalogSource = "traffic" | "parked";

export type DriveCatalogEntry = VehicleSpec & {
  /** Visual / traffic kind (0…11) or parked prop kind. */
  catalogId: number;
  source: CatalogSource;
  archetype: DriveArchetype;
};

function seatsCar(): Seat[] {
  return [
    { x: -0.4, y: 0.62, z: 0.28, pose: 1 },
    { x: 0.4, y: 0.62, z: 0.28, pose: 2 },
    { x: 0.4, y: 0.62, z: -0.6, pose: 2 },
    { x: -0.4, y: 0.62, z: -0.6, pose: 2 },
  ];
}

function seatsBike(): Seat[] {
  return [
    { x: 0, y: 0.82, z: -0.02, pose: 3 },
    { x: 0, y: 0.84, z: -0.58, pose: 4 },
  ];
}

function seatsAuto(): Seat[] {
  return [
    { x: 0, y: 0.78, z: 0.3, pose: 1 },
    { x: 0.28, y: 0.7, z: -0.55, pose: 2 },
    { x: -0.28, y: 0.7, z: -0.55, pose: 2 },
  ];
}

function entry(
  catalogId: number,
  source: CatalogSource,
  archetype: DriveArchetype,
  partial: Partial<Omit<VehicleSpec, "kind">> & { name: string; blurb: string },
): DriveCatalogEntry {
  const base = SPECS[archetype];
  return {
    ...base,
    ...partial,
    kind: archetype,
    catalogId,
    source,
    archetype,
    seats: partial.seats ?? base.seats,
  };
}

/** Traffic kinds 0…11 → full drive defs. */
export const TRAFFIC_DRIVE: Record<TrafficKind, DriveCatalogEntry> = {
  0: entry(0, "traffic", 1, {
    name: TRAFFIC_NAMES[0],
    blurb: "Zippy three-wheeler.",
    maxSpeed: 15.5,
    seats: seatsAuto(),
    camDist: 7.2,
    camHeight: 1.9,
    lean: 0.04,
  }),
  1: entry(1, "traffic", 2, {
    name: TRAFFIC_NAMES[1],
    blurb: "Lean into gaps.",
    maxSpeed: 21,
    seats: seatsBike(),
    camDist: 6.4,
    camHeight: 1.7,
    lean: 0.5,
  }),
  2: entry(2, "traffic", 3, {
    name: TRAFFIC_NAMES[2],
    blurb: "City hatch.",
    maxSpeed: 27,
    seats: seatsCar(),
    camDist: 8.6,
    camHeight: 2.2,
  }),
  3: entry(3, "traffic", 3, {
    name: TRAFFIC_NAMES[3],
    blurb: "Heavy coach — slow but unstoppable.",
    maxSpeed: 14,
    accel: 4.2,
    brake: 12,
    length: 10.2,
    width: 2.5,
    radius: 1.4,
    wheelBase: 5.5,
    maxSteer: 0.38,
    seats: seatsCar(),
    camDist: 14,
    camHeight: 3.2,
    lean: 0.01,
  }),
  4: entry(4, "traffic", 3, {
    name: TRAFFIC_NAMES[4],
    blurb: "Goods hauler.",
    maxSpeed: 13,
    accel: 3.8,
    brake: 11,
    length: 8.4,
    width: 2.5,
    radius: 1.35,
    wheelBase: 4.8,
    maxSteer: 0.4,
    seats: seatsCar(),
    camDist: 12,
    camHeight: 3.0,
  }),
  5: entry(5, "traffic", 2, {
    name: TRAFFIC_NAMES[5],
    blurb: "Faster two-wheeler.",
    maxSpeed: 24,
    accel: 9.2,
    seats: seatsBike(),
    camDist: 6.6,
    camHeight: 1.75,
    lean: 0.55,
  }),
  6: entry(6, "traffic", 3, {
    name: TRAFFIC_NAMES[6],
    blurb: "Tall family SUV.",
    maxSpeed: 24,
    length: 4.6,
    width: 1.9,
    seats: seatsCar(),
    camDist: 9.2,
    camHeight: 2.5,
  }),
  7: entry(7, "traffic", 3, {
    name: TRAFFIC_NAMES[7],
    blurb: "Mini goods tempo.",
    maxSpeed: 14,
    accel: 4.5,
    length: 4.8,
    width: 1.85,
    seats: seatsCar(),
    camDist: 9.0,
    camHeight: 2.4,
  }),
  8: entry(8, "traffic", 3, {
    name: TRAFFIC_NAMES[8],
    blurb: "Box van.",
    maxSpeed: 22,
    length: 4.9,
    width: 1.95,
    seats: seatsCar(),
    camDist: 9.4,
    camHeight: 2.6,
  }),
  9: entry(9, "traffic", 3, {
    name: TRAFFIC_NAMES[9],
    blurb: "Open jeep.",
    maxSpeed: 23,
    length: 4.0,
    width: 1.8,
    seats: seatsCar(),
    camDist: 8.8,
    camHeight: 2.3,
  }),
  10: entry(10, "traffic", 3, {
    name: TRAFFIC_NAMES[10],
    blurb: "Black-and-yellow taxi.",
    maxSpeed: 26,
    seats: seatsCar(),
    camDist: 8.6,
    camHeight: 2.2,
  }),
  11: entry(11, "traffic", 1, {
    name: TRAFFIC_NAMES[11],
    blurb: "Quiet battery rickshaw.",
    maxSpeed: 12,
    accel: 4.2,
    seats: seatsAuto(),
    camDist: 7.0,
    camHeight: 1.85,
  }),
};

/** World parked prop kinds: 0 bike, 1 auto, 2 cab. */
export const PARKED_DRIVE: Record<0 | 1 | 2, DriveCatalogEntry> = {
  0: entry(0, "parked", 2, { name: "Scooter", blurb: "Parked scooter.", seats: seatsBike(), lean: 0.5 }),
  1: entry(1, "parked", 1, { name: "Auto-rickshaw", blurb: "Parked auto.", seats: seatsAuto() }),
  2: entry(2, "parked", 3, { name: "Cab", blurb: "Parked cab.", seats: seatsCar() }),
};

export function trafficDrive(kind: TrafficKind): DriveCatalogEntry {
  return TRAFFIC_DRIVE[kind];
}

export function parkedDrive(kind: 0 | 1 | 2): DriveCatalogEntry {
  return PARKED_DRIVE[kind];
}

/** Spec used by arcade step / camera — falls back to archetype SPECS. */
export function specForArchetype(archetype: DriveArchetype): VehicleSpec {
  return SPECS[archetype];
}

export function archetypeOf(kind: VehicleKind): DriveArchetype | 0 {
  if (kind === 1 || kind === 2 || kind === 3) return kind;
  return 0;
}
