/** Trees + shrubs for CityProps. */
import * as THREE from "three";
import { makeInstanced } from "@/gfx/instancing";
import { shrubGeo, treeCrown, treeTrunk } from "@/gfx/trees";
import type { PropBuildCtx } from "./city-props-ctx";
import { registerDestMesh } from "./dest-register";

export function buildFlora(ctx: PropBuildCtx): void {
  const { city, add, disposables, registerDest } = ctx;
  const trunkGeo = treeTrunk();
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#6a4a32", roughness: 0.92 });
  const crownGeo = treeCrown();
  const crownMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.88 });
  const treeIdx = city.trees.map((_, i) => i);
  const trunkMesh = add(
    makeInstanced(
      trunkGeo,
      trunkMat,
      city.trees.length,
      (i, o) => {
        const t = city.trees[i];
        o.position.set(t.x, 0, t.z);
        o.scale.set(t.s, t.s, t.s);
        o.rotation.y = (i * 1.7) % 6.28;
      },
      { cast: true },
    ),
  );
  const crownMesh = add(
    makeInstanced(
      crownGeo,
      crownMat,
      city.trees.length,
      (i, o) => {
        const t = city.trees[i];
        o.position.set(t.x, 4.35 * t.s, t.z);
        o.rotation.y = (i * 2.399) % 6.28;
        o.scale.set(1.55 * t.s, 1.35 * t.s, 1.55 * t.s);
      },
      { cast: true, color: (i) => city.trees[i].color },
    ),
  );
  registerDestMesh(registerDest, "tree", trunkMesh, city.trees.length, treeIdx, crownMesh);

  const shrub = shrubGeo();
  const shrubMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const shrubIdx = city.shrubs.map((_, i) => i);
  const shrubMesh = add(
    makeInstanced(
      shrub,
      shrubMat,
      city.shrubs.length,
      (i, o) => {
        const s = city.shrubs[i];
        o.position.set(s.x, 0, s.z);
        o.rotation.y = (i * 1.3) % 6.28;
        o.scale.setScalar(s.s);
      },
      { cast: true },
    ),
  );
  registerDestMesh(registerDest, "shrub", shrubMesh, city.shrubs.length, shrubIdx);
  disposables.push(trunkGeo, trunkMat, crownGeo, crownMat, shrub, shrubMat);
}
