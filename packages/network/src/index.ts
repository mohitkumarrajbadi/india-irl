export { hermitePose } from "./interp/hermite.ts";
export type { PoseSample } from "./interp/hermite.ts";
export { sampleRemoteHermite } from "./interp/sample-remote.ts";
export type { RemoteSnap, RemotePose } from "./interp/sample-remote.ts";
export {
  POSE_BYTES,
  POSE_VER,
  encodePose,
  decodePose,
  poseToBase64,
  poseFromBase64,
  type PoseFields,
} from "./protocol/pose-codec.ts";
