"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { makeInstanced } from "@/gfx/instancing";
import type { CityData } from "@/world/types";

/** Soft plaza rings so hangouts are visible from a block away. */
export function MeetMarkers({ city }: { city: CityData }) {
  const set = useMemo(() => {
    const ring = new THREE.RingGeometry(2.4, 3.1, 32);
    ring.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: "#e7c56a",
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rings = makeInstanced(ring, ringMat, city.meets.length, (i, o) => {
      const meet = city.meets[i];
      o.position.set(meet.x, 0.04, meet.z);
    });
    rings.renderOrder = 2;

    const pole = new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8);
    pole.translate(0, 1.6, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: "#e7c56a", roughness: 0.55, metalness: 0.2 });
    const poles = makeInstanced(pole, poleMat, city.meets.length, (i, o) => {
      o.position.set(city.meets[i].x + 2.2, 0, city.meets[i].z + 2.2);
    }, { cast: true });

    return { rings, poles, disposables: [ring, ringMat, pole, poleMat] };
  }, [city]);

  return (
    <>
      <primitive object={set.rings} />
      <primitive object={set.poles} />
    </>
  );
}
