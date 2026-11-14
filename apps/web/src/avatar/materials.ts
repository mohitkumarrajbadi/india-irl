/** Avatar-only materials — silicone skin + glossy Memoji eyes. */
import * as THREE from "three";

/** Soft-touch clay / silicone for skin, hair, clothes. */
export const avatarMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.78,
  metalness: 0.0,
});

/** Warm sclera pillow behind the pupil. */
export const eyeScleraMat = new THREE.MeshStandardMaterial({
  color: "#f7f2ea",
  roughness: 0.45,
  metalness: 0,
});

/** Glossy black Memoji eyes (not vertex-colored). */
export const eyeMat = new THREE.MeshStandardMaterial({
  color: "#0a0a0c",
  roughness: 0.08,
  metalness: 0.08,
});

/** Specular catchlight on the eye. */
export const eyeHighlightMat = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.04,
  metalness: 0,
  emissive: "#ffffff",
  emissiveIntensity: 0.45,
});
