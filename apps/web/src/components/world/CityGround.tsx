"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { weather } from "@/game/weather";
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
    const paverTex = paverTexture("#ffffff");
    const std = (map: THREE.Texture | null, vertexColors: boolean, rough = 0.93) =>
      new THREE.MeshStandardMaterial({ map, vertexColors, roughness: rough, metalness: 0 });
    const zebraMat = new THREE.MeshStandardMaterial({
      map: zebraTex,
      transparent: true,
      alphaTest: 0.4,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const minor = std(roadMinor, false);
    const art = std(roadArt, false);
    const plain = std(roadPlain, false);
    return {
      geos,
      textures: [roadMinor, roadArt, roadPlain, zebraTex, paverTex],
      mats: {
        minor,
        art,
        plain,
        paver: std(paverTex, true),
        lot: std(paverTex, true, 1),
        grass: std(null, true, 1),
        zebra: zebraMat,
        marks: new THREE.MeshStandardMaterial({
          color: "#ece8d8",
          roughness: 0.9,
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

  useFrame(() => {
    const wet = weather.wet;
    for (const m of roadMats.current) {
      m.roughness = 0.93 - wet * 0.55;
      m.metalness = wet * 0.28;
    }
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
