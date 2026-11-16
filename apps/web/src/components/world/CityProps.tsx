"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type * as THREE from "three";
import { DestructibleSim } from "@/game/destructible-sim";
import { lampGlow } from "@/gfx/atmosphere-fx";
import { env } from "@/gfx/env";
import { live, runtime } from "@/game/runtime";
import { weather } from "@/game/weather";
import type { CityData } from "@/world/types";
import type { PropBuildCtx } from "./city-props-ctx";
import { buildExtras } from "./city-props-extras";
import { buildFlora } from "./city-props-flora";
import { buildLamps, updateLampLights } from "./city-props-lamps";
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

  const lastKey = useRef("");
  const glowRef = useRef({ head: 0, poolOpacity: 0, lightIntensity: 0 });
  useFrame((_, dt) => {
    const n = env.night;
    const key = `${n.toFixed(2)}:${weather.wet.toFixed(2)}:${weather.fog.toFixed(2)}`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      const glow = lampGlow(n, weather.wet, weather.fog);
      glowRef.current = glow;
      const h = glow.head;
      // Hot sodium head — brighter when fully night
      set.headMat.color.setRGB(0.45 + 1.2 * h, 0.38 + 0.9 * h, 0.22 + 0.4 * h);
      set.poolMat.opacity = glow.poolOpacity;
      set.pools.visible = glow.poolOpacity > 0.03;
    }
    updateLampLights(
      city.lamps,
      set.spots,
      set.points,
      live.x,
      live.z,
      n,
      glowRef.current.lightIntensity,
    );
    set.sim.tick(Math.min(dt, 0.05), performance.now());
  });

  return (
    <>
      {set.meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <primitive object={set.lightsRoot} />
      <DestructibleDebris sim={set.sim} />
    </>
  );
}
