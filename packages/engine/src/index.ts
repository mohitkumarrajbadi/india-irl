export { SimBridge } from "./physics/bridge.ts";
export type { SimBridgeHandlers } from "./physics/bridge.ts";
export type { SnapshotEntity } from "./physics/bridge-decode.ts";
export {
  SIM_PROTOCOL,
  SNAP_STRIDE,
  SNAP_FLAGS,
  type MainToSim,
  type SimToMain,
  type SimInput,
  type SimEvent,
} from "./physics/protocol.ts";
export { createIntent, intentToSimInput, type Intent } from "./input/unified.ts";
export { RaycastVehicleController } from "./physics/vehicle-controller.ts";
export { tuningFor, chassisHalfExtents } from "./physics/vehicle-tuning.ts";
export { healthDriveScale } from "./physics/health-drive.ts";
export type { HealthDriveScale } from "./physics/health-drive.ts";
export { clamp, quatFromYaw } from "./physics/math3.ts";
export { lerpPose, type PoseSample } from "./physics/pose-lerp.ts";
export {
  KILL_PLANE_Y,
  ROAD_FRICTION,
  ROAD_SURFACE_Y,
  VEHICLE_FRICTION,
} from "./physics/materials.ts";
export { createSnapshotChannel } from "./physics/snapshot-channel.ts";
