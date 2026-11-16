"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { weather } from "@/game/weather";
import { wetRoadParams } from "@/gfx/atmosphere-fx";
import { paverTexture, roadTexture, zebraTexture } from "@/gfx/textures";
import type { CityData } from "@/world/types";
import { buildCityGround } from "./city-ground-build";

export function CityGround({ city }: { city: CityData }) {
  const roadMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const stuff = useMemo(() => {
    const geos = buildCityGround(city);
    const roadMinor = roadTexture("minor");
    const roadArt = roadTexture("arterial");
    const roadPlain = roadTexture("plain");
    const zebraTex = zebraTexture();
    // Mid-grey tile base — city palette comes from vertex colors
    const paverTex = paverTexture("#8a8680");
    const roadMat = (map: THREE.Texture, rough = 0.94) =>
      new THREE.MeshStandardMaterial({
        map,
        // Slight lift so dusk/moon + streetlights read asphalt (not a black void)
        color: "#d4d4d4",
        roughness: rough,
        metalness: 0.02,
        envMapIntensity: 0.12,
      });
    // Opaque zebra on asphalt (no alpha) — kills white-slab mip artifacts
    const zebraMat = new THREE.MeshStandardMaterial({
      map: zebraTex,
      color: "#c4c4c4",
      roughness: 0.95,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const minor = roadMat(roadMinor);
    const art = roadMat(roadArt);
    const plain = roadMat(roadPlain, 0.95);
    const paver = new THREE.MeshStandardMaterial({
      map: paverTex,
      // Soften vertex tint so sidewalks don't flash white vs asphalt at dusk
      color: "#b0ada8",
      vertexColors: true,
      roughness: 0.98,
      metalness: 0,
      envMapIntensity: 0.06,
    });
    return {
      geos,
      textures: [roadMinor, roadArt, roadPlain, zebraTex, paverTex],
      mats: {
        minor,
        art,
        plain,
        paver,
        lot: new THREE.MeshStandardMaterial({
          map: paverTex,
          vertexColors: true,
          roughness: 1,
          metalness: 0,
        }),
        grass: new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 1,
          metalness: 0,
        }),
        zebra: zebraMat,
        marks: new THREE.MeshStandardMaterial({
          color: "#9a9588",
          roughness: 0.96,
          metalness: 0.02,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
        base: new THREE.MeshStandardMaterial({ color: city.config.palette.ground, roughness: 1 }),
      },
      roads: [minor, art, plain] as THREE.MeshStandardMaterial[],
    };
  }, [city]);

  useEffect(() => {
    roadMats.current = stuff.roads;
    return () => {
      Object.values(stuff.geos).forEach((g) => g.dispose());
      stuff.textures.forEach((t) => t.dispose());
      Object.values(stuff.mats).forEach((m) => m.dispose());
    };
  }, [stuff]);

  const lastWet = useRef(-1);
  const baseColors = useRef<THREE.Color[]>([]);
  useEffect(() => {
    baseColors.current = stuff.roads.map((m) => m.color.clone());
  }, [stuff]);
  useFrame(() => {
    const wet = weather.wet;
    if (Math.abs(wet - lastWet.current) < 0.008) return;
    lastWet.current = wet;
    const p = wetRoadParams(wet);
    roadMats.current.forEach((m, i) => {
      m.roughness = p.roughness;
      m.metalness = p.metalness;
      const base = baseColors.current[i];
      if (base) m.color.copy(base).multiplyScalar(p.colorMul);
    });
  });

  const { geos, mats } = stuff;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.04, 0]} material={mats.base} receiveShadow>
        <planeGeometry args={[3600, 3600]} />
      </mesh>
      <mesh geometry={geos.paver} material={mats.paver} receiveShadow />
      <mesh geometry={geos.lot} material={mats.lot} receiveShadow />
      <mesh geometry={geos.grass} material={mats.grass} receiveShadow />
      <mesh geometry={geos.minor} material={mats.minor} receiveShadow />
      <mesh geometry={geos.art} material={mats.art} receiveShadow />
      <mesh geometry={geos.plain} material={mats.plain} receiveShadow />
      <mesh geometry={geos.marks} material={mats.marks} receiveShadow />
      <mesh geometry={geos.zebra} material={mats.zebra} receiveShadow />
    </group>
  );
}
