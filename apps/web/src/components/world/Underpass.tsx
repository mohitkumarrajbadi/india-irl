"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CityData } from "@/world/types";

const RAMP = 14;

/** Visual dipped arterial + retaining walls. */
export function UnderpassMesh({ city }: { city: CityData }) {
  const u = city.underpass;
  const stuff = useMemo(() => {
    if (!u || u.axis !== "x") return null;
    const span = u.a1 - u.a0;
    const ramp = Math.min(RAMP, span * 0.28);
    const midLen = Math.max(4, span - ramp * 2);
    const mat = new THREE.MeshStandardMaterial({ color: "#5a5e66", roughness: 0.9, metalness: 0.05 });
    const wallMat = new THREE.MeshStandardMaterial({ color: "#6e7278", roughness: 0.88 });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(midLen, 0.4, u.half * 2), mat);
    floor.position.set((u.a0 + u.a1) * 0.5, u.floorY, u.c);
    floor.receiveShadow = true;

    const angle = Math.atan2(-u.floorY, ramp);
    const rampGeo = new THREE.BoxGeometry(ramp, 0.4, u.half * 2);
    const rampW = new THREE.Mesh(rampGeo, mat);
    rampW.position.set(u.a0 + ramp * 0.5, u.floorY * 0.5, u.c);
    rampW.rotation.z = angle;
    const rampE = new THREE.Mesh(rampGeo, mat);
    rampE.position.set(u.a1 - ramp * 0.5, u.floorY * 0.5, u.c);
    rampE.rotation.z = -angle;

    const wallH = 3.2;
    const wallT = 0.55;
    const wallGeo = new THREE.BoxGeometry(midLen, wallH, wallT);
    const wallS = new THREE.Mesh(wallGeo, wallMat);
    const wallN = new THREE.Mesh(wallGeo, wallMat);
    wallS.position.set((u.a0 + u.a1) * 0.5, u.floorY + wallH * 0.5, u.c - u.half - wallT * 0.5);
    wallN.position.set((u.a0 + u.a1) * 0.5, u.floorY + wallH * 0.5, u.c + u.half + wallT * 0.5);

    // Overhead slab hint under the crossing
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(u.crossHalf * 2.2, 0.5, u.half * 2.4),
      wallMat,
    );
    slab.position.set(u.crossC, 0.25, u.c);

    return {
      floor,
      rampW,
      rampE,
      wallS,
      wallN,
      slab,
      geos: [floor.geometry, rampGeo, wallGeo, slab.geometry],
      mats: [mat, wallMat],
    };
  }, [u]);

  useEffect(
    () => () => {
      if (!stuff) return;
      for (const g of stuff.geos) g.dispose();
      for (const m of stuff.mats) m.dispose();
    },
    [stuff],
  );

  if (!stuff) return null;
  return (
    <group>
      <primitive object={stuff.floor} />
      <primitive object={stuff.rampW} />
      <primitive object={stuff.rampE} />
      <primitive object={stuff.wallS} />
      <primitive object={stuff.wallN} />
      <primitive object={stuff.slab} />
    </group>
  );
}
