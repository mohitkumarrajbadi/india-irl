"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { cow, goat, streetDog } from "@/gfx/props";
import { live, runtime } from "@/game/runtime";
import { quality } from "@/game/quality";
import { AnimalSim } from "@/world/animals";
import type { CityData } from "@/world/types";
import { COW_TINTS, DOG_TINTS, GOAT_TINTS } from "./city-props-ctx";

/** Animated cows / dogs / goats seeded from city placements. */
export function Animals({ city }: { city: CityData }) {
  const set = useMemo(() => {
    const sim = new AnimalSim(city);
    const cows = sim.animals.filter((a) => a.kind === 0);
    const dogs = sim.animals.filter((a) => a.kind === 1);
    const goats = sim.animals.filter((a) => a.kind === 2);
    const cast = quality.active.shadows;
    const cowGeo = cow();
    const dogGeo = streetDog();
    const goatGeo = goat();
    const cowMesh = makeInstanced(cowGeo, vertexMat, Math.max(1, cows.length), () => {}, {
      cast,
      color: (i) => COW_TINTS[cows[i]!.tint % COW_TINTS.length],
    });
    const dogMesh = makeInstanced(dogGeo, vertexMat, Math.max(1, dogs.length), () => {}, {
      cast,
      color: (i) => DOG_TINTS[dogs[i]!.tint % DOG_TINTS.length],
    });
    const goatMesh = makeInstanced(goatGeo, vertexMat, Math.max(1, goats.length), () => {}, {
      cast,
      color: (i) => GOAT_TINTS[goats[i]!.tint % GOAT_TINTS.length],
    });
    for (const m of [cowMesh, dogMesh, goatMesh]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
    }
    cowMesh.count = cows.length;
    dogMesh.count = dogs.length;
    goatMesh.count = goats.length;
    return { sim, cows, dogs, goats, cowMesh, dogMesh, goatMesh, geos: [cowGeo, dogGeo, goatGeo] };
  }, [city]);

  useEffect(() => {
    runtime.animals = set.sim;
    return () => {
      if (runtime.animals === set.sim) runtime.animals = null;
      for (const g of set.geos) g.dispose();
      set.cowMesh.dispose();
      set.dogMesh.dispose();
      set.goatMesh.dispose();
    };
  }, [set]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const veh = live.vehicle > 0 ? live.speed : 0;
    set.sim.update(dt, live.x, live.z, veh);
    writeKind(set.cowMesh, set.cows);
    writeKind(set.dogMesh, set.dogs);
    writeKind(set.goatMesh, set.goats);
  });

  return (
    <>
      <primitive object={set.cowMesh} />
      <primitive object={set.dogMesh} />
      <primitive object={set.goatMesh} />
    </>
  );
}

function writeKind(
  mesh: THREE.InstancedMesh,
  list: { x: number; z: number; yaw: number; scale: number; phase: number; mood: string; speed: number }[],
): void {
  const e = mesh.instanceMatrix.array as Float32Array;
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i]!;
    const sin = Math.sin(a.yaw);
    const cos = Math.cos(a.yaw);
    const bob = a.mood === "roam" || a.mood === "flee" ? Math.abs(Math.sin(a.phase)) * 0.03 : 0;
    const s = a.scale;
    const o = i * 16;
    e[o] = cos * s;
    e[o + 1] = 0;
    e[o + 2] = -sin * s;
    e[o + 3] = 0;
    e[o + 4] = 0;
    e[o + 5] = s;
    e[o + 6] = 0;
    e[o + 7] = 0;
    e[o + 8] = sin * s;
    e[o + 9] = 0;
    e[o + 10] = cos * s;
    e[o + 11] = 0;
    e[o + 12] = a.x;
    e[o + 13] = bob;
    e[o + 14] = a.z;
    e[o + 15] = 1;
  }
  mesh.instanceMatrix.needsUpdate = true;
}
