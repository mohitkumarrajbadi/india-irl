"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CityData } from "@/world/types";
import { buildTrailRoadGeos } from "./trail-roads-build";

/** Village dirt tracks + asphalt hill switchbacks on the terrain apron. */
export function TrailRoads({ city }: { city: CityData }) {
  const stuff = useMemo(() => {
    const geos = buildTrailRoadGeos(city);
    const village = new THREE.MeshStandardMaterial({
      color: "#8a6840",
      roughness: 1,
      metalness: 0,
      vertexColors: true,
      flatShading: true,
    });
    const hill = new THREE.MeshStandardMaterial({
      color: "#3e4046",
      roughness: 0.88,
      metalness: 0.05,
      vertexColors: true,
    });
    return { geos, mats: { village, hill } };
  }, [city]);

  useEffect(
    () => () => {
      stuff.geos.village.dispose();
      stuff.geos.hill.dispose();
      stuff.mats.village.dispose();
      stuff.mats.hill.dispose();
    },
    [stuff],
  );

  return (
    <group>
      <mesh geometry={stuff.geos.village} material={stuff.mats.village} receiveShadow castShadow={false} />
      <mesh geometry={stuff.geos.hill} material={stuff.mats.hill} receiveShadow castShadow={false} />
    </group>
  );
}
