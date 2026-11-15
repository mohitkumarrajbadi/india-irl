"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CityData } from "@/world/types";

/** Elevated arterial deck + pillars — drive underneath; snap onto deck when on top. */
export function FlyoverMesh({ city }: { city: CityData }) {
  const fo = city.flyover;
  const stuff = useMemo(() => {
    if (!fo) return null;
    const deck = new THREE.BoxGeometry(fo.half * 2, 0.55, fo.z1 - fo.z0);
    const pillarGeo = new THREE.CylinderGeometry(0.55, 0.65, fo.deckY - 0.4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: "#6a6e75", roughness: 0.85, metalness: 0.08 });
    const railMat = new THREE.MeshStandardMaterial({ color: "#9aa0a8", roughness: 0.7 });
    const deckMesh = new THREE.Mesh(deck, mat);
    deckMesh.position.set(fo.x, fo.deckY, (fo.z0 + fo.z1) * 0.5);
    deckMesh.receiveShadow = true;
    deckMesh.castShadow = true;
    const pillars: THREE.Mesh[] = [];
    for (const p of fo.pillars) {
      const m = new THREE.Mesh(pillarGeo, mat);
      m.position.set(p.x, (fo.deckY - 0.4) * 0.5, p.z);
      m.castShadow = true;
      pillars.push(m);
    }
    // Side rails
    const railGeo = new THREE.BoxGeometry(0.12, 0.7, fo.z1 - fo.z0);
    const railL = new THREE.Mesh(railGeo, railMat);
    const railR = new THREE.Mesh(railGeo, railMat);
    railL.position.set(fo.x - fo.half + 0.1, fo.deckY + 0.5, (fo.z0 + fo.z1) * 0.5);
    railR.position.set(fo.x + fo.half - 0.1, fo.deckY + 0.5, (fo.z0 + fo.z1) * 0.5);
    return { deckMesh, pillars, railL, railR, geos: [deck, pillarGeo, railGeo], mats: [mat, railMat] };
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
      {stuff.pillars.map((p, i) => (
        <primitive key={i} object={p} />
      ))}
      <primitive object={stuff.railL} />
      <primitive object={stuff.railR} />
    </group>
  );
}
