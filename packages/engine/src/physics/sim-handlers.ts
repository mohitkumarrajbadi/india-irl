/** MainToSim message switch + runtime factory (worker). */
import type { MainToSim } from "./protocol.ts";
import { loadChunk, unloadChunk } from "./chunks.ts";
import { spawnLocalCharacter, spawnVehicleEntity } from "./sim-spawn.ts";
import type { PostFn, SimStores, WorkerRuntime } from "./sim-types.ts";
import { createLoopState } from "./world-loop.ts";
import { despawnVehicle } from "./sim-despawn.ts";
import {
  applyImpulse,
  disposeRuntime,
  enterVehicle,
  exitVehicle,
  mirrorPose,
  syncLocal,
  syncVehicle,
} from "./sim-vehicle-cmds.ts";

export type { WorkerRuntime };
export { handleInit } from "./sim-init.ts";

export function createEmptyInput(): SimStores["input"] {
  return {
    moveX: 0,
    moveZ: 0,
    yaw: 0,
    throttle: 0,
    steer: 0,
    brake: 0,
    handbrake: false,
    sprint: false,
    jump: false,
    interact: false,
    actions: [],
  };
}

export function createRuntime(post: PostFn): WorkerRuntime {
  return {
    rapier: null,
    world: null,
    ready: false,
    stores: {
      chars: new Map(),
      vehicles: new Map(),
      chunks: new Map(),
      input: createEmptyInput(),
      localId: 1,
      drivingVehicleId: 0,
    },
    loop: createLoopState(),
    post,
  };
}

export function handleMessage(rt: WorkerRuntime, msg: MainToSim): void {
  switch (msg.type) {
    case "SPAWN_LOCAL":
      if (rt.world && rt.rapier) {
        rt.stores.localId = msg.id;
        if (!rt.stores.chars.has(msg.id)) {
          spawnLocalCharacter(rt.rapier, rt.world, rt.stores.chars, msg.id, msg.x, msg.y, msg.z, msg.yaw);
        } else {
          syncLocal(rt, msg.id, msg.x, msg.y, msg.z, msg.yaw);
        }
      }
      break;
    case "SYNC_LOCAL":
      syncLocal(rt, msg.id, msg.x, msg.y, msg.z, msg.yaw);
      break;
    case "SPAWN_VEHICLE":
      if (rt.world && rt.rapier) {
        const v = msg.vehicle;
        if (rt.stores.vehicles.has(v.id)) despawnVehicle(rt, v.id);
        spawnVehicleEntity(rt.rapier, rt.world, rt.stores.vehicles, v.id, v.kind, v.x, v.y, v.z, v.yaw);
      }
      break;
    case "DESPAWN_VEHICLE":
      despawnVehicle(rt, msg.id);
      break;
    case "SYNC_VEHICLE":
      syncVehicle(rt, msg.id, msg.x, msg.y, msg.z, msg.yaw);
      break;
    case "SET_INPUT":
      Object.assign(rt.stores.input, msg.input);
      rt.stores.input.actions = msg.input.actions?.slice() ?? [];
      break;
    case "ENTER_VEHICLE":
      enterVehicle(rt, msg.vehicleId, msg.seat);
      break;
    case "EXIT_VEHICLE":
      exitVehicle(rt);
      break;
    case "SET_AUTHORITY": {
      const v = rt.stores.vehicles.get(msg.vehicleId);
      if (v) v.controller.authority = msg.authority;
      break;
    }
    case "LOAD_CHUNK":
      if (rt.world && rt.rapier) {
        const c = msg.chunk;
        loadChunk(
          rt.rapier,
          rt.world,
          rt.stores.chunks,
          c.cellX,
          c.cellZ,
          c.boxes,
          c.roadVerts,
          c.roadIndices,
        );
      }
      break;
    case "UNLOAD_CHUNK":
      if (rt.world) unloadChunk(rt.world, rt.stores.chunks, msg.cellX, msg.cellZ);
      break;
    case "APPLY_IMPULSE":
      applyImpulse(rt, msg.entityId, msg.ix, msg.iy, msg.iz);
      break;
    case "NET_REMOTE_POSE":
      mirrorPose(rt, msg);
      break;
    case "DISPOSE":
      disposeRuntime(rt);
      break;
    default:
      break;
  }
}
