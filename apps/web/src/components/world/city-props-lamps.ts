/** Street lamps + night glow pools for CityProps. */
import * as THREE from "three";
import { makeInstanced } from "@/gfx/instancing";
import { glowDisc, lampPost } from "@/gfx/props";
import type { PropBuildCtx } from "./city-props-ctx";
import { registerDestMesh } from "./dest-register";

export type LampNightMats = {
  headMat: THREE.MeshBasicMaterial;
  poolMat: THREE.MeshBasicMaterial;
  pools: THREE.InstancedMesh;
};

export function buildLamps(ctx: PropBuildCtx): LampNightMats {
  const { city, add, disposables, registerDest } = ctx;
  const lamp = lampPost();
  const lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 });
  const headMat = new THREE.MeshBasicMaterial({ color: "#888888", fog: true });
  const poolGeo = new THREE.PlaneGeometry(10, 10);
  poolGeo.rotateX(-Math.PI / 2);
  const poolTex = glowDisc();
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const lampIdx = city.lamps.map((_, i) => i);
  const postMesh = add(
    makeInstanced(
      lamp.post,
      lampMat,
      city.lamps.length,
      (i, o) => {
        const l = city.lamps[i];
        o.position.set(l.x, 0, l.z);
        o.rotation.y = l.rot;
      },
      { cast: true },
    ),
  );
  const headMesh = add(
    makeInstanced(lamp.head, headMat, city.lamps.length, (i, o) => {
      const l = city.lamps[i];
      o.position.set(l.x, 0, l.z);
      o.rotation.y = l.rot;
    }),
  );
  registerDestMesh(registerDest, "lamp", postMesh, city.lamps.length, lampIdx, headMesh);
  const pools = add(
    makeInstanced(poolGeo, poolMat, city.lamps.length, (i, o) => {
      const l = city.lamps[i];
      o.position.set(l.x + Math.sin(l.rot) * 1.9, 0.075, l.z + Math.cos(l.rot) * 1.9);
    }),
  );
  pools.renderOrder = 3;
  disposables.push(lamp.post, lamp.head, lampMat, headMat, poolGeo, poolTex, poolMat);
  return { headMat, poolMat, pools };
}
