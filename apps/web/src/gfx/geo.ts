import * as THREE from "three";
import { vertexMat as surfaceVertexMat } from "./surface";

export { GeoBuilder } from "./geo-builder";
export { QuadBatch } from "./geo-quad";

/** Shared vertex-color + per-vertex finish material for props / vehicles. */
export const vertexMat = surfaceVertexMat;
export const flatVertexMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.02,
  flatShading: true,
});
