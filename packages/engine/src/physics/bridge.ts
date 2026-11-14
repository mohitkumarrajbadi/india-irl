/**
 * Main-thread API to the Simulation Worker.
 * React/R3F binds snapshots; never runs Rapier here.
 */
import { SIM_PROTOCOL, type MainToSim, type SimEvent, type SimInput, type SimToMain, type VehicleSpawn } from "./protocol.ts";
import { decodeSnapshot, type SnapshotEntity } from "./bridge-decode.ts";

export type { SnapshotEntity };

export type SimBridgeHandlers = {
  onReady?: () => void;
  onSnapshot?: (tick: number, entities: SnapshotEntity[]) => void;
  onEvent?: (event: SimEvent) => void;
};

export class SimBridge {
  private worker: Worker;
  private handlers: SimBridgeHandlers;
  private entities: SnapshotEntity[] = [];
  private tick = 0;
  ready = false;

  constructor(worker: Worker, handlers: SimBridgeHandlers = {}) {
    this.worker = worker;
    this.handlers = handlers;
    this.worker.onmessage = (ev: MessageEvent<SimToMain>) => this.onMessage(ev.data);
  }

  init(gravity = 9.81, seed = 1): void {
    this.send({ type: "INIT", gravity, seed });
  }

  spawnLocal(id: number, x: number, y: number, z: number, yaw = 0): void {
    this.send({ type: "SPAWN_LOCAL", id, x, y, z, yaw });
  }

  syncLocal(id: number, x: number, y: number, z: number, yaw: number): void {
    this.send({ type: "SYNC_LOCAL", id, x, y, z, yaw });
  }

  spawnVehicle(vehicle: VehicleSpawn): void {
    this.send({ type: "SPAWN_VEHICLE", vehicle });
  }

  despawnVehicle(id: number): void {
    this.send({ type: "DESPAWN_VEHICLE", id });
  }

  syncVehicle(id: number, x: number, y: number, z: number, yaw: number): void {
    this.send({ type: "SYNC_VEHICLE", id, x, y, z, yaw });
  }

  setInput(input: SimInput): void {
    this.send({ type: "SET_INPUT", input });
  }

  enterVehicle(vehicleId: number, seat = 0): void {
    this.send({ type: "ENTER_VEHICLE", vehicleId, seat });
  }

  exitVehicle(): void {
    this.send({ type: "EXIT_VEHICLE" });
  }

  setAuthority(vehicleId: number, authority: boolean): void {
    this.send({ type: "SET_AUTHORITY", vehicleId, authority });
  }

  loadChunk(
    cellX: number,
    cellZ: number,
    boxes: Float32Array,
    roadVerts?: Float32Array,
    roadIndices?: Uint32Array,
  ): void {
    const chunk = { cellX, cellZ, boxes, roadVerts, roadIndices };
    const transfer: Transferable[] = [];
    // Transfer ownership of packed buffers — zero GC churn at 60 Hz stream rates.
    if (boxes.byteLength) transfer.push(boxes.buffer);
    if (roadVerts?.byteLength) transfer.push(roadVerts.buffer);
    if (roadIndices?.byteLength) transfer.push(roadIndices.buffer);
    this.worker.postMessage({ type: "LOAD_CHUNK", chunk } satisfies MainToSim, transfer);
  }

  unloadChunk(cellX: number, cellZ: number): void {
    this.send({ type: "UNLOAD_CHUNK", cellX, cellZ });
  }

  applyImpulse(entityId: number, ix: number, iy: number, iz: number): void {
    this.send({ type: "APPLY_IMPULSE", entityId, ix, iy, iz });
  }

  mirrorRemotePose(
    entityId: number,
    pose: { x: number; y: number; z: number; qx: number; qy: number; qz: number; qw: number },
  ): void {
    this.send({ type: "NET_REMOTE_POSE", entityId, ...pose, kinematic: true });
  }

  latest(): { tick: number; entities: readonly SnapshotEntity[] } {
    return { tick: this.tick, entities: this.entities };
  }

  dispose(): void {
    this.send({ type: "DISPOSE" });
    this.worker.terminate();
  }

  private send(msg: MainToSim): void {
    this.worker.postMessage(msg);
  }

  private onMessage(msg: SimToMain): void {
    if (msg.type === "READY") {
      if (msg.protocol !== SIM_PROTOCOL) console.warn("[SimBridge] protocol mismatch", msg.protocol);
      this.ready = true;
      this.handlers.onReady?.();
      return;
    }
    if (msg.type === "SNAPSHOT") {
      this.tick = msg.tick;
      this.entities = decodeSnapshot(msg.data, msg.count);
      this.handlers.onSnapshot?.(msg.tick, this.entities);
      return;
    }
    if (msg.type === "EVENT") this.handlers.onEvent?.(msg.event);
  }
}
