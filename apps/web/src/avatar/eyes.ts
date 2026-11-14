/** Glossy Memoji eyes — separate meshes so they can shine. */
import * as THREE from "three";
import { eyeHighlightMat, eyeMat, eyeScleraMat } from "./materials";
import { EYE } from "./parts";

/**
 * Soft sclera pillows + glossy black ovals + catchlights.
 * Parented under the scaled head root so they share Memoji head scale.
 */
export function attachMemojiEyes(parent: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  for (const sx of [1, -1] as const) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.032, 20, 16), eyeScleraMat);
    sclera.scale.set(0.92, 1.05, 0.42);
    sclera.position.set(sx * EYE.x, EYE.y, EYE.z - 0.004);
    sclera.castShadow = true;
    parent.add(sclera);
    meshes.push(sclera);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 22, 18), eyeMat);
    eye.scale.set(0.82, 1.18, 0.58);
    eye.position.set(sx * EYE.x, EYE.y, EYE.z + 0.002);
    eye.castShadow = true;
    parent.add(eye);
    meshes.push(eye);

    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 10), eyeHighlightMat);
    hi.position.set(sx * EYE.x - sx * 0.008, EYE.y + 0.01, EYE.z + 0.02);
    parent.add(hi);
    meshes.push(hi);

    // Secondary tiny sparkle — Apple Memoji catchlight pair
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 8, 6), eyeHighlightMat);
    hi2.position.set(sx * EYE.x + sx * 0.006, EYE.y - 0.006, EYE.z + 0.016);
    parent.add(hi2);
    meshes.push(hi2);
  }
  return meshes;
}
