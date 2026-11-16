"use client";

/** Subtle door markers for apartment pads. */
import { useMemo } from "react";
import * as THREE from "three";
import { apartmentList } from "@/game/apartment";
import type { CityData } from "@/world/types";

export function ApartmentDoors({ city }: { city: CityData }) {
  const mesh = useMemo(() => {
    const apts = apartmentList(city);
    const geo = new THREE.BoxGeometry(1.1, 2.2, 0.12);
    const mat = new THREE.MeshStandardMaterial({ color: "#5c4030", roughness: 0.75 });
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, apts.length));
    const dummy = new THREE.Object3D();
    apts.forEach((a, i) => {
      dummy.position.set(a.x, 1.1, a.z);
      dummy.rotation.set(0, a.yaw, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.castShadow = true;
    m.count = apts.length;
    return { m, geo, mat };
  }, [city]);

  return <primitive object={mesh.m} />;
}
