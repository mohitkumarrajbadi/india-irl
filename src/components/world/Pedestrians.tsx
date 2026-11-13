"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GeoBuilder, vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { quality } from "@/game/quality";
import { live, runtime } from "@/game/runtime";
import { BOTTOM_COLORS, SKIN_TONES, TOP_COLORS } from "@/avatar/appearance";
import { PedestrianSim } from "@/world/pedestrians";
import type { CityData } from "@/world/types";

const PED_COUNTS = { low: 28, medium: 48, high: 72 } as const;

/**
 * Soft chibi sidewalk figure — closer to player avatar proportions than a
 * stick capsule, still cheap enough to instance by the dozen.
 */
function pedGeometry(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const base = "#ffffff";
  // legs
  g.capsule(0.055, 0.38, base, { pos: [0.08, 0.4, 0] });
  g.capsule(0.055, 0.38, base, { pos: [-0.08, 0.4, 0] });
  // torso (slightly wider — kurta / tee read)
  g.cyl(0.13, 0.15, 0.52, base, { pos: [0, 0.98, 0], scale: [1, 1, 0.72] }, 8);
  // hips / bottom hint
  g.box(0.28, 0.16, 0.18, base, { pos: [0, 0.68, 0] });
  // arms
  g.capsule(0.042, 0.3, base, { pos: [0.2, 1.0, 0], rot: [0, 0, 0.15] });
  g.capsule(0.042, 0.3, base, { pos: [-0.2, 1.0, 0], rot: [0, 0, -0.15] });
  // head + hair cap
  g.sphere(0.14, base, { pos: [0, 1.42, 0] }, 10);
  g.sphere(0.145, "#2a1a10", { pos: [0, 1.48, -0.01], scale: [1, 0.75, 1.05] }, 8);
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
    for (let i = 0; i < sim.peds.length; i += 1) {
      const skin = new THREE.Color(SKIN_TONES[sim.peds[i].skin % SKIN_TONES.length]);
      const top = new THREE.Color(TOP_COLORS[sim.peds[i].top % TOP_COLORS.length]);
      const bottom = new THREE.Color(BOTTOM_COLORS[sim.peds[i].bottom % BOTTOM_COLORS.length]);
      // Prefer outfit colour with a warm skin wash so the crowd reads Indian street life.
      const c = top.clone().lerp(skin, 0.22).lerp(bottom, 0.14);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    return { sim, mesh, geo };
  }, [city, count]);

  useEffect(() => {
    runtime.peds = set.sim;
    return () => {
      if (runtime.peds === set.sim) runtime.peds = null;
      set.geo.dispose();
      set.mesh.dispose();
    };
  }, [set]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    set.sim.update(dt, live.x, live.z, performance.now());
    const e = set.mesh.instanceMatrix.array as Float32Array;
    const peds = set.sim.peds;
    for (let i = 0; i < peds.length; i += 1) {
      const p = peds[i];
      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      const bob = Math.abs(Math.sin(p.phase)) * 0.035;
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
