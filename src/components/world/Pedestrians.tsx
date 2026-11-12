"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GeoBuilder, vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { quality } from "@/game/quality";
import { live } from "@/game/runtime";
import { BOTTOM_COLORS, SKIN_TONES, TOP_COLORS } from "@/avatar/appearance";
import { PedestrianSim } from "@/world/pedestrians";
import type { CityData } from "@/world/types";

const PED_COUNTS = { low: 28, medium: 48, high: 72 } as const;

function pedGeometry(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  // Unit figure facing +Z; tinted per-instance via instanceColor on a white base.
  g.cyl(0.12, 0.14, 0.55, "#ffffff", { pos: [0, 0.95, 0], scale: [1, 1, 0.7] }, 8);
  g.sphere(0.13, "#ffffff", { pos: [0, 1.38, 0] }, 8);
  g.capsule(0.045, 0.28, "#ffffff", { pos: [0.16, 1.05, 0] });
  g.capsule(0.045, 0.28, "#ffffff", { pos: [-0.16, 1.05, 0] });
  g.capsule(0.05, 0.36, "#ffffff", { pos: [0.07, 0.42, 0] });
  g.capsule(0.05, 0.36, "#ffffff", { pos: [-0.07, 0.42, 0] });
  return g.build();
}

/** Instanced sidewalk crowd. Seeded per city so every client sees the same walkers. */
export function Pedestrians({ city }: { city: CityData }) {
  const count = PED_COUNTS[quality.active.id];
  const set = useMemo(() => {
    const sim = new PedestrianSim(city, count);
    const geo = pedGeometry();
    const mesh = makeInstanced(geo, vertexMat, sim.peds.length, () => {}, {
      cast: quality.active.shadows,
      color: (i) => TOP_COLORS[sim.peds[i].top % TOP_COLORS.length],
    });
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Bake a blended tint: mostly top color with a hint of skin on the head (approx via average).
    for (let i = 0; i < sim.peds.length; i += 1) {
      const skin = new THREE.Color(SKIN_TONES[sim.peds[i].skin % SKIN_TONES.length]);
      const top = new THREE.Color(TOP_COLORS[sim.peds[i].top % TOP_COLORS.length]);
      const bottom = new THREE.Color(BOTTOM_COLORS[sim.peds[i].bottom % BOTTOM_COLORS.length]);
      const c = top.clone().lerp(skin, 0.18).lerp(bottom, 0.12);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    return { sim, mesh, geo };
  }, [city, count]);

  useEffect(
    () => () => {
      set.geo.dispose();
      set.mesh.dispose();
    },
    [set],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    set.sim.update(dt, live.x, live.z);
    const e = set.mesh.instanceMatrix.array as Float32Array;
    const peds = set.sim.peds;
    for (let i = 0; i < peds.length; i += 1) {
      const p = peds[i];
      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      const bob = Math.abs(Math.sin(p.phase)) * 0.03;
      const o = i * 16;
      e[o] = cos; e[o + 1] = 0; e[o + 2] = -sin; e[o + 3] = 0;
      e[o + 4] = 0; e[o + 5] = 1; e[o + 6] = 0; e[o + 7] = 0;
      e[o + 8] = sin; e[o + 9] = 0; e[o + 10] = cos; e[o + 11] = 0;
      e[o + 12] = p.x; e[o + 13] = bob; e[o + 14] = p.z; e[o + 15] = 1;
    }
    set.mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={set.mesh} />;
}
