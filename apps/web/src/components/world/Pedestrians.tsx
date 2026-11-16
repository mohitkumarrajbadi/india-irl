"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GeoBuilder, vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { quality } from "@/game/quality";
import { live, runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { env } from "@/gfx/env";
import { BOTTOM_COLORS, SKIN_TONES, TOP_COLORS } from "@/avatar/appearance";
import { PedestrianSim } from "@/world/pedestrians";
import type { CityData } from "@/world/types";

const PED_COUNTS = { low: 14, medium: 22, high: 32 } as const;

/**
 * Soft chibi sidewalk figure — closer to player avatar proportions than a
 * stick capsule, still cheap enough to instance by the dozen.
 */
function pedGeometry(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const base = "#ffffff";
  // Soft Memoji chibi — continuous capsules, oversized head
  g.capsule(0.055, 0.38, base, { pos: [0.08, 0.4, 0] }, 4, 8);
  g.capsule(0.055, 0.38, base, { pos: [-0.08, 0.4, 0] }, 4, 8);
  g.sphere(0.16, base, { pos: [0, 0.72, 0], scale: [1.05, 0.7, 0.85] }, 10);
  g.cyl(0.13, 0.15, 0.52, base, { pos: [0, 0.98, 0], scale: [1, 1, 0.72] }, 12);
  g.capsule(0.042, 0.3, base, { pos: [0.2, 1.0, 0], rot: [0, 0, 0.15] }, 4, 8);
  g.capsule(0.042, 0.3, base, { pos: [-0.2, 1.0, 0], rot: [0, 0, -0.15] }, 4, 8);
  g.sphere(0.15, base, { pos: [0, 1.44, 0] }, 14);
  g.sphere(0.155, "#2a1a10", { pos: [0, 1.5, -0.01], scale: [1.02, 0.72, 1.05] }, 12);
  return g.build();
}

/** Instanced sidewalk crowd. Seeded per city so every client sees the same walkers. */
export function Pedestrians({ city }: { city: CityData }) {
  // Prefer preference over auto-tier so demote/promote doesn't remount the crowd
  const qualityId = useGame((s) => s.qualityId);
  const tier = qualityId === "auto" ? "medium" : qualityId;
  const count = PED_COUNTS[tier];
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
    set.sim.update(dt, live.x, live.z, performance.now(), env.night, {
      yaw: live.yaw,
      speed: live.speed,
      vehicle: live.vehicle,
    });
    const e = set.mesh.instanceMatrix.array as Float32Array;
    const peds = set.sim.peds;
    for (let i = 0; i < peds.length; i += 1) {
      const p = peds[i];
      const sin = Math.sin(p.yaw);
      const cos = Math.cos(p.yaw);
      const o = i * 16;
      const flat = p.mood === "down" || p.mood === "runover";
      const air = p.mood === "thrown";
      if (flat || air) {
        // Ragdoll / flat: tumble in air, lie when down or run over
        const tumble = air ? Math.sin(p.phase) : 0;
        const upY = air ? Math.cos(tumble) : 0;
        const upZ = air ? Math.sin(tumble) : -1;
        e[o] = cos; e[o + 1] = 0; e[o + 2] = -sin; e[o + 3] = 0;
        e[o + 4] = sin * (air ? Math.sin(tumble) : 1); e[o + 5] = upY; e[o + 6] = cos * (air ? Math.sin(tumble) : 1); e[o + 7] = 0;
        e[o + 8] = 0; e[o + 9] = upZ; e[o + 10] = air ? Math.cos(tumble) * 0.2 : 0; e[o + 11] = 0;
        e[o + 12] = p.x; e[o + 13] = air ? Math.max(0.2, p.y) : 0.14; e[o + 14] = p.z; e[o + 15] = 1;
      } else {
        const bob = Math.abs(Math.sin(p.phase)) * 0.035;
        e[o] = cos; e[o + 1] = 0; e[o + 2] = -sin; e[o + 3] = 0;
        e[o + 4] = 0; e[o + 5] = 1; e[o + 6] = 0; e[o + 7] = 0;
        e[o + 8] = sin; e[o + 9] = 0; e[o + 10] = cos; e[o + 11] = 0;
        e[o + 12] = p.x; e[o + 13] = bob; e[o + 14] = p.z; e[o + 15] = 1;
      }
    }
    set.mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={set.mesh} />;
}
