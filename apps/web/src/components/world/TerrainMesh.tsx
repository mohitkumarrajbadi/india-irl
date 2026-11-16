"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { QUALITY_PRESETS, quality } from "@/game/quality";
import { useGame } from "@/game/store";
import { heightAt, regionAt } from "@/world/terrain-sample";
import { terrainProfile } from "@/world/terrain-profile";
import type { CityData } from "@/world/types";

/** Outer apron + soft fringe undulation (city fabric stays flat). */
export function TerrainMesh({ city }: { city: CityData }) {
  const tier = useGame((s) => s.qualityTier);
  const { geo, mat } = useMemo(() => {
    const seg = (QUALITY_PRESETS[tier] ?? quality.active).terrainSeg;
    const prof = terrainProfile(city.config.id);
    const { bounds } = city;
    const cx = (bounds.minX + bounds.maxX) * 0.5;
    const cz = (bounds.minZ + bounds.maxZ) * 0.5;
    const spanX = bounds.maxX - bounds.minX + prof.apron * 2;
    const spanZ = bounds.maxZ - bounds.minZ + prof.apron * 2;
    const geo = new THREE.PlaneGeometry(spanX, spanZ, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const urban = new THREE.Color(city.config.palette.ground);
    const field = new THREE.Color("#6a8a3a");
    const dirt = new THREE.Color("#8a7048");
    const rock = new THREE.Color(city.config.skyline.hillColor);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i) + cx;
      const z = pos.getZ(i) + cz;
      const y = heightAt(city, x, z);
      pos.setY(i, Math.max(0, y - 0.02));
      const region = regionAt(city, x, z);
      if (region === "hills") tmp.copy(rock).lerp(field, 0.35);
      else if (region === "village") tmp.copy(field).lerp(dirt, 0.4);
      else if (region === "highway") tmp.copy(urban).multiplyScalar(0.85);
      else tmp.copy(urban);
      // Carve a soft hole so city ground meshes win inside bounds
      const inside =
        x > bounds.minX - 4 &&
        x < bounds.maxX + 4 &&
        z > bounds.minZ - 4 &&
        z < bounds.maxZ + 4;
      if (inside && y < 0.4) {
        pos.setY(i, -0.08);
        tmp.copy(urban);
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      flatShading: false,
    });
    return { geo, mat, cx, cz };
  }, [city, tier]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  const cx = (city.bounds.minX + city.bounds.maxX) * 0.5;
  const cz = (city.bounds.minZ + city.bounds.maxZ) * 0.5;

  return (
    <mesh
      geometry={geo}
      material={mat}
      position={[cx, 0, cz]}
      receiveShadow
      frustumCulled={false}
    />
  );
}
