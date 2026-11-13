/** Data-only vehicle tunings (maps arcade SPECS → Rapier forces). */
import { VK, type VehicleKind } from "../../../shared/src/index.ts";

export type WheelTuning = {
  radius: number;
  restLength: number;
  maxTravel: number;
  stiffness: number;
  damping: number;
  friction: number;
  local: { x: number; y: number; z: number };
};

export type VehicleTuning = {
  kind: VehicleKind;
  mass: number;
  maxForce: number;
  maxSteer: number;
  brakeForce: number;
  handbrakeForce: number;
  leanGain: number;
  wheels: WheelTuning[];
};

function wheel(x: number, y: number, z: number, radius: number): WheelTuning {
  return {
    radius,
    restLength: 0.35,
    maxTravel: 0.22,
    stiffness: 45_000,
    damping: 4200,
    friction: 1.35,
    local: { x, y, z },
  };
}

export function tuningFor(kind: VehicleKind): VehicleTuning {
  if (kind === VK.bike) {
    return {
      kind,
      mass: 140,
      maxForce: 2800,
      maxSteer: 0.55,
      brakeForce: 4200,
      handbrakeForce: 5200,
      leanGain: 0.5,
      wheels: [
        wheel(-0.35, 0.12, 0.55, 0.22),
        wheel(0.35, 0.12, 0.55, 0.22),
        wheel(-0.35, 0.12, -0.55, 0.22),
        wheel(0.35, 0.12, -0.55, 0.22),
      ],
    };
  }
  if (kind === VK.cab) {
    return {
      kind,
      mass: 1200,
      maxForce: 9000,
      maxSteer: 0.48,
      brakeForce: 16000,
      handbrakeForce: 18000,
      leanGain: 0,
      wheels: [
        wheel(-0.75, 0.2, 1.25, 0.32),
        wheel(0.75, 0.2, 1.25, 0.32),
        wheel(-0.75, 0.2, -1.25, 0.32),
        wheel(0.75, 0.2, -1.25, 0.32),
      ],
    };
  }
  return {
    kind: VK.auto,
    mass: 420,
    maxForce: 5200,
    maxSteer: 0.62,
    brakeForce: 9000,
    handbrakeForce: 11000,
    leanGain: 0.04,
    wheels: [wheel(0, 0.18, 1.0, 0.28), wheel(-0.55, 0.18, -0.75, 0.28), wheel(0.55, 0.18, -0.75, 0.28)],
  };
}

/** Chassis half-extents for collider cook. */
export function chassisHalfExtents(kind: number): { hx: number; hy: number; hz: number } {
  if (kind === VK.bike) return { hx: 0.35, hy: 0.45, hz: 0.85 };
  if (kind === VK.cab) return { hx: 0.9, hy: 0.45, hz: 2.0 };
  return { hx: 0.65, hy: 0.45, hz: 1.2 };
}
