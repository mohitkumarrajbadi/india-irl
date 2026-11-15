"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type * as THREE from "three";
import { DestructibleSim } from "@/game/destructible-sim";
import { env } from "@/gfx/env";
import { runtime } from "@/game/runtime";
import type { CityData } from "@/world/types";
import type { PropBuildCtx } from "./city-props-ctx";
import { buildExtras } from "./city-props-extras";
import { buildFlora } from "./city-props-flora";
import { buildLamps } from "./city-props-lamps";
import { buildStreetLife } from "./city-props-life";
import { buildParked } from "./city-props-parked";
import { DestructibleDebris } from "./DestructibleDebris";

export function CityProps({ city }: { city: CityData }) {
  const set = useMemo(() => {
    const sim = new DestructibleSim(city);
    const meshes: THREE.InstancedMesh[] = [];
    const disposables: { dispose(): void }[] = [];
    const add = (m: THREE.InstancedMesh) => {
      meshes.push(m);
      return m;
    };
    const ctx: PropBuildCtx = {
      city,
      add,
      disposables,
      registerDest: (b) => sim.registerBucket(b),
    };
    buildFlora(ctx);
    const night = buildLamps(ctx);
    buildStreetLife(ctx);
    buildExtras(ctx);
    buildParked(ctx);
    return { meshes, disposables, sim, ...night };
  }, [city]);

  useEffect(() => {
    runtime.destructibles = set.sim;
    return () => {
      if (runtime.destructibles === set.sim) runtime.destructibles = null;
      set.disposables.forEach((d) => d.dispose());
      set.meshes.forEach((m) => m.dispose());
    };
  }, [set]);

  useFrame((_, dt) => {
    const n = env.night;
    set.headMat.color.setRGB(0.3 + 0.9 * n, 0.28 + 0.78 * n, 0.24 + 0.5 * n);
    set.poolMat.opacity = n * 0.55;
    set.pools.visible = n > 0.04;
    set.sim.tick(Math.min(dt, 0.05), performance.now());
  });

  return (
    <>
      {set.meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <DestructibleDebris sim={set.sim} />
    </>
  );
}
