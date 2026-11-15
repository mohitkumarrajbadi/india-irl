/** Data-only vehicle tunings (maps arcade physics-props → Rapier forces). */
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
  /** Centre of mass local Y. */
  comY: number;
  maxForce: number;
  maxSteer: number;
  brakeForce: number;
  handbrakeForce: number;
  leanGain: number;
  wheels: WheelTuning[];
};

function wheel(
  x: number,
  y: number,
  z: number,
  radius: number,
  susp: number,
  friction: number,
): WheelTuning {
  return {
    radius,
    restLength: 0.28 + susp * 0.1,
    maxTravel: 0.16 + susp * 0.1,
    stiffness: 28_000 * susp,
    damping: 2800 * Math.sqrt(susp),
    friction,
    local: { x, y, z },
  };
}

export function tuningFor(kind: VehicleKind): VehicleTuning {
  if (kind === VK.bike) {
    const susp = 0.55;
    const grip = 1.05;
    return {
      kind,
      mass: 140,
      comY: 0.42,
      maxForce: 2800,
      maxSteer: 0.55,
      brakeForce: 4200,
      handbrakeForce: 5200,
      leanGain: 0.5,
      wheels: [
        wheel(-0.35, 0.12, 0.55, 0.22, susp, grip),
        wheel(0.35, 0.12, 0.55, 0.22, susp, grip),
        wheel(-0.35, 0.12, -0.55, 0.22, susp, grip),
        wheel(0.35, 0.12, -0.55, 0.22, susp, grip),
      ],
    };
  }
  if (kind === VK.cab) {
    const susp = 1.05;
    const grip = 1.0;
    return {
      kind,
      mass: 1200,
      comY: 0.48,
      maxForce: 9000,
      maxSteer: 0.48,
      brakeForce: 16000,
      handbrakeForce: 18000,
      leanGain: 0,
      wheels: [
        wheel(-0.75, 0.2, 1.25, 0.32, susp, grip),
        wheel(0.75, 0.2, 1.25, 0.32, susp, grip),
        wheel(-0.75, 0.2, -1.25, 0.32, susp, grip),
        wheel(0.75, 0.2, -1.25, 0.32, susp, grip),
      ],
    };
  }
  const susp = 0.85;
  const grip = 0.92;
  return {
    kind: VK.auto,
    mass: 420,
    comY: 0.55,
    maxForce: 5200,
    maxSteer: 0.62,
    brakeForce: 9000,
    handbrakeForce: 11000,
    leanGain: 0.04,
    wheels: [
      wheel(0, 0.18, 1.0, 0.28, susp, grip),
      wheel(-0.55, 0.18, -0.75, 0.28, susp, grip),
      wheel(0.55, 0.18, -0.75, 0.28, susp, grip),
    ],
  };
}

/** Chassis half-extents for collider cook. */
export function chassisHalfExtents(kind: number): { hx: number; hy: number; hz: number } {
  if (kind === VK.bike) return { hx: 0.35, hy: 0.45, hz: 0.85 };
  if (kind === VK.cab) return { hx: 0.9, hy: 0.45, hz: 2.0 };
  return { hx: 0.65, hy: 0.55, hz: 1.2 };
}
