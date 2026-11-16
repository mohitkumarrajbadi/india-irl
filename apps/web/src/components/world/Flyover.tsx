"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CityData } from "@/world/types";

const RAMP_LEN = 22;

/** Elevated arterial deck + pillars + approach ramps — drive under mid-span. */
export function FlyoverMesh({ city }: { city: CityData }) {
  const fo = city.flyover;
  const stuff = useMemo(() => {
    if (!fo) return null;
    const span = fo.z1 - fo.z0;
    const ramp = Math.min(RAMP_LEN, span * 0.28);
    const midLen = Math.max(4, span - ramp * 2);
    const deck = new THREE.BoxGeometry(fo.half * 2, 0.55, midLen);
    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, fo.deckY - 0.4, 8);
    const rampGeo = new THREE.BoxGeometry(fo.half * 2, 0.55, ramp);
    const mat = new THREE.MeshStandardMaterial({ color: "#6a6e75", roughness: 0.85, metalness: 0.08 });
    const railMat = new THREE.MeshStandardMaterial({ color: "#9aa0a8", roughness: 0.7 });
    const deckMesh = new THREE.Mesh(deck, mat);
    deckMesh.position.set(fo.x, fo.deckY, fo.z0 + ramp + midLen * 0.5);
    deckMesh.receiveShadow = true;
    deckMesh.castShadow = true;

    const angle = Math.atan2(fo.deckY, ramp);
    const rampS = new THREE.Mesh(rampGeo, mat);
    rampS.position.set(fo.x, fo.deckY * 0.5, fo.z0 + ramp * 0.5);
    rampS.rotation.x = -angle;
    rampS.receiveShadow = true;
    rampS.castShadow = true;
    const rampN = new THREE.Mesh(rampGeo, mat);
    rampN.position.set(fo.x, fo.deckY * 0.5, fo.z1 - ramp * 0.5);
    rampN.rotation.x = angle;
    rampN.receiveShadow = true;
    rampN.castShadow = true;

    const pillars: THREE.Mesh[] = [];
    for (const p of fo.pillars) {
      const m = new THREE.Mesh(pillarGeo, mat);
      m.position.set(p.x, (fo.deckY - 0.4) * 0.5, p.z);
      m.castShadow = true;
      pillars.push(m);
    }
    const railGeo = new THREE.BoxGeometry(0.12, 0.7, midLen);
    const railL = new THREE.Mesh(railGeo, railMat);
    const railR = new THREE.Mesh(railGeo, railMat);
    const midZ = fo.z0 + ramp + midLen * 0.5;
    railL.position.set(fo.x - fo.half + 0.1, fo.deckY + 0.5, midZ);
    railR.position.set(fo.x + fo.half - 0.1, fo.deckY + 0.5, midZ);
    return {
      deckMesh,
      rampS,
      rampN,
      pillars,
      railL,
      railR,
      geos: [deck, pillarGeo, rampGeo, railGeo],
      mats: [mat, railMat],
    };
  }, [fo]);

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
      <primitive object={stuff.deckMesh} />
      <primitive object={stuff.rampS} />
      <primitive object={stuff.rampN} />
      {stuff.pillars.map((p, i) => (
        <primitive key={i} object={p} />
      ))}
      <primitive object={stuff.railL} />
      <primitive object={stuff.railR} />
    </group>
  );
}
