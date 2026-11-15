import type { DriveState, VehicleKind } from "@/vehicles/specs";
import type * as THREE from "three";

export type Mode = "foot" | "drive" | "passenger";

export type Keys = {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  shift: boolean;
  space: boolean;
};

export type ParkedVehicle = {
  x: number;
  z: number;
  yaw: number;
  kind: 1 | 2 | 3;
  until: number;
  /** Index into city.parked when this slot came from the world. */
  worldIndex?: number;
};

export type PlayerState = {
  mode: Mode;
  x: number;
  z: number;
  y: number;
  vy: number;
  facing: number;
  speed: number;
  actual: number;
  dir: THREE.Vector3;
  ds: DriveState;
  kind: VehicleKind;
  seat: number;
  rideWith: string | null;
  emote: number;
  emoteStart: number;
  camYaw: number;
  camPitch: number;
  zoom: number;
  idle: number;
  fov: number;
  keys: Keys;
  mouseX: number;
  mouseY: number;
  sample: number;
  frames: number;
  send: number;
  sayHeard: number;
  lastSent: string;
  hudKey: string;
  ambient: string;
  hangDone: boolean;
  lastKind: 1 | 2 | 3;
  parked: ParkedVehicle | null;
  /** city.parked index currently driven; null if none. */
  worldParkedIndex: number | null;
  kb: { x: number; z: number };
  coyote: number;
  stunUntil: number;
  fightCd: number;
  hp: number;
  /** Structural integrity of current chassis (from physics durability). */
  chassisHp: number;
  crashCd: number;
  lastCrashToast: number;
  wastedUntil: number;
  shake: number;
  blinker: -1 | 0 | 1;
  /** True after matching steer while blinker on — cancel when steer centers. */
  blinkerArmed: boolean;
  pedCrushCd: number;
};

export type CrashHitOpts = {
  otherMass?: number;
  closing?: number;
  speedAfter?: number;
  yawKick?: number;
};

export type PlayerCmds = {
  interact: () => void;
  vehicle: () => void;
  honkNow: () => void;
  emote: (id: number) => void;
  strike: (k: 0 | 1) => void;
  ejectCrash: (severity: number, nx: number, nz: number) => void;
  triggerWasted: (reason?: string) => void;
  applyCrashHit: (
    sev: number,
    nx: number,
    nz: number,
    speed: number,
    opts?: CrashHitOpts,
  ) => boolean;
};
