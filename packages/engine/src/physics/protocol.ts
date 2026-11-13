/**
 * Main thread ↔ Simulation Worker wire protocol.
 * Keep payloads transferable / TypedArray-friendly — no class instances.
 */

import type { VehicleKind } from "../../../shared/src/index.ts";

export const SIM_PROTOCOL = 1 as const;

export type SimInput = {
  /** xz intent, length ≤ 1. */
  moveX: number;
  moveZ: number;
  /** Radians/frame look (yaw already applied on main for cam; sim uses facing). */
  yaw: number;
  throttle: number;
  steer: number;
  brake: number;
  handbrake: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
  /** One-shot action codes drained each tick. */
  actions: number[];
};

export type VehicleSpawn = {
  id: number;
  kind: VehicleKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
};

export type ChunkCollider = {
  cellX: number;
  cellZ: number;
  /** Packed AABB list: minX,minY,minZ,maxX,maxY,maxZ per box. */
  boxes: Float32Array;
};

/** Entity transform slot in SNAPSHOT SoA (floats). */
export const SNAP_STRIDE = 11;
/** layout: id, kind, x,y,z, qx,qy,qz,qw, linSpeed, flags */

export const SNAP_FLAGS = {
  grounded: 1 << 0,
  ragdoll: 1 << 1,
  inVehicle: 1 << 2,
  authority: 1 << 3,
} as const;

export type MainToSim =
  | { type: "INIT"; gravity: number; seed: number }
  | { type: "LOAD_CHUNK"; chunk: ChunkCollider }
  | { type: "UNLOAD_CHUNK"; cellX: number; cellZ: number }
  | { type: "SET_INPUT"; input: SimInput }
  | { type: "SPAWN_LOCAL"; id: number; x: number; y: number; z: number; yaw: number }
  | { type: "SYNC_LOCAL"; id: number; x: number; y: number; z: number; yaw: number }
  | { type: "SPAWN_VEHICLE"; vehicle: VehicleSpawn }
  | { type: "DESPAWN_VEHICLE"; id: number }
  | { type: "SYNC_VEHICLE"; id: number; x: number; y: number; z: number; yaw: number }
  | { type: "ENTER_VEHICLE"; vehicleId: number; seat: number }
  | { type: "EXIT_VEHICLE" }
  | { type: "SET_AUTHORITY"; vehicleId: number; authority: boolean }
  | { type: "APPLY_IMPULSE"; entityId: number; ix: number; iy: number; iz: number }
  | {
      type: "NET_REMOTE_POSE";
      entityId: number;
      x: number;
      y: number;
      z: number;
      qx: number;
      qy: number;
      qz: number;
      qw: number;
      kinematic: boolean;
    }
  | { type: "DISPOSE" };

export type SimEvent =
  | {
      type: "HIT";
      attacker: number;
      target: number;
      damage: number;
      kx: number;
      kz: number;
    }
  | {
      type: "IMPACT";
      entityId: number;
      fx: number;
      fy: number;
      fz: number;
      speed: number;
    }
  | { type: "RAGDOLL"; entityId: number; on: boolean }
  | { type: "SEATED"; entityId: number; vehicleId: number; seat: number }
  | { type: "READY" };

export type SimToMain =
  | { type: "READY"; protocol: typeof SIM_PROTOCOL }
  | {
      type: "SNAPSHOT";
      tick: number;
      /** Float32Array length = count * SNAP_STRIDE */
      data: Float32Array;
      count: number;
    }
  | { type: "EVENT"; event: SimEvent };
