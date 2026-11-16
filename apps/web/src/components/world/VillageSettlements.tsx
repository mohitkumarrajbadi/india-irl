"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { heightAt } from "@/world/terrain-sample";
import type { CityData } from "@/world/types";

/** Simple hut clusters along rural trails. */
export function VillageSettlements({ city }: { city: CityData }) {
  const stuff = useMemo(() => {
    if (!city.villages.length) return null;
    const hutMat = new THREE.MeshStandardMaterial({ color: "#c4a882", roughness: 0.92 });
    const roofMat = new THREE.MeshStandardMaterial({ color: "#6a4a32", roughness: 0.95 });
    const dustMat = new THREE.MeshStandardMaterial({ color: "#8a7a58", roughness: 1 });
    const meshes: THREE.Object3D[] = [];
    const geos: THREE.BufferGeometry[] = [];

    for (const v of city.villages) {
      for (const h of v.huts) {
        const y = heightAt(city, h.x, h.z);
        const body = new THREE.BoxGeometry(h.w, h.h, h.d);
        const roof = new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.72, h.h * 0.45, 4);
        geos.push(body, roof);
        const m = new THREE.Mesh(body, hutMat);
        m.position.set(h.x, y + h.h * 0.5, h.z);
        m.rotation.y = h.rot;
        m.castShadow = true;
        m.receiveShadow = true;
        const r = new THREE.Mesh(roof, roofMat);
        r.position.set(h.x, y + h.h + h.h * 0.2, h.z);
        r.rotation.y = h.rot + Math.PI / 4;
        r.castShadow = true;
        meshes.push(m, r);
      }
      const disc = new THREE.CircleGeometry(5.5, 16);
      geos.push(disc);
      const ground = new THREE.Mesh(disc, dustMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(v.x, heightAt(city, v.x, v.z) + 0.04, v.z);
      ground.receiveShadow = true;
      meshes.push(ground);
    }

    return { meshes, geos, mats: [hutMat, roofMat, dustMat] };
  }, [city]);

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
      {stuff.meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}
