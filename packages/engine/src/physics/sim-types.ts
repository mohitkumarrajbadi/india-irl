import type RAPIER from "@dimforge/rapier3d-compat";
import type { CharState } from "./character.ts";
import type { ChunkResident } from "./chunks.ts";
import type { RaycastVehicleController } from "./vehicle-controller.ts";
import type { SimInput, SimToMain } from "./protocol.ts";
import type { LoopState } from "./loop-state.ts";

export type VehState = {
  id: number;
  kind: number;
  controller: RaycastVehicleController;
  collider: RAPIER.Collider;
};

export type PostFn = (msg: SimToMain, transfer?: Transferable[]) => void;

export type SimStores = {
  chars: Map<number, CharState>;
  vehicles: Map<number, VehState>;
  chunks: Map<string, ChunkResident>;
  input: SimInput;
  localId: number;
  drivingVehicleId: number;
};

export type WorkerRuntime = {
  rapier: typeof RAPIER | null;
  world: RAPIER.World | null;
  ready: boolean;
  stores: SimStores;
  loop: LoopState;
  post: PostFn;
};
