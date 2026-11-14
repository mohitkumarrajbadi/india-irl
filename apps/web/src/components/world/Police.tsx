"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GeoBuilder, vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { toast } from "@/game/store";
import { live, runtime } from "@/game/runtime";
import { PoliceSim } from "@/world/police";
import type { CityData } from "@/world/types";

/** Khaki traffic-police silhouette + white sleeves / reflective belt. */
function copGeometry(): THREE.BufferGeometry {
  const g = new GeoBuilder();
  const khaki = "#c4a35a";
  const white = "#f2f0e8";
  const boot = "#2a2a2a";
  g.capsule(0.055, 0.36, boot, { pos: [0.08, 0.38, 0] }, 4, 8);
  g.capsule(0.055, 0.36, boot, { pos: [-0.08, 0.38, 0] }, 4, 8);
  g.cyl(0.14, 0.16, 0.5, khaki, { pos: [0, 0.96, 0], scale: [1, 1, 0.72] }, 12);
  g.roundBox(0.3, 0.08, 0.2, "#f2c230", { pos: [0, 0.78, 0.05] }, 0.03, 2);
  g.capsule(0.04, 0.28, white, { pos: [0.2, 0.98, 0], rot: [0, 0, 0.12] }, 4, 8);
  g.capsule(0.04, 0.28, white, { pos: [-0.2, 0.98, 0], rot: [0, 0, -0.12] }, 4, 8);
  g.sphere(0.14, "#d4a574", { pos: [0, 1.42, 0] }, 14);
  g.roundBox(0.28, 0.08, 0.22, "#1a3a6a", { pos: [0, 1.54, 0] }, 0.03, 2);
  g.capsule(0.025, 0.16, "#f2c230", { pos: [0.18, 1.05, 0.08] }, 3, 6);
  return g.build();
}

export function Police({ city }: { city: CityData }) {
  const toasted = useRef(0);
  const set = useMemo(() => {
    const sim = new PoliceSim(city);
    const geo = copGeometry();
    const mesh = makeInstanced(geo, vertexMat, sim.cops.length, () => {}, {
      cast: true,
      color: () => "#c4a35a",
    });
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    return { sim, mesh, geo };
  }, [city]);

  useEffect(() => {
    runtime.police = set.sim;
    return () => {
      if (runtime.police === set.sim) runtime.police = null;
      set.geo.dispose();
      set.mesh.dispose();
    };
  }, [set]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const arrived = set.sim.update(dt, now);
    if (arrived && now - toasted.current > 4000) {
      toasted.current = now;
      toast("Traffic police on scene");
    }
    const e = set.mesh.instanceMatrix.array as Float32Array;
    const cops = set.sim.cops;
    for (let i = 0; i < cops.length; i += 1) {
      const c = cops[i];
      const sin = Math.sin(c.yaw);
      const cos = Math.cos(c.yaw);
      const bob = Math.abs(Math.sin(c.phase)) * 0.03;
      const o = i * 16;
      e[o] = cos;
      e[o + 1] = 0;
      e[o + 2] = -sin;
      e[o + 3] = 0;
      e[o + 4] = 0;
      e[o + 5] = 1;
      e[o + 6] = 0;
      e[o + 7] = 0;
      e[o + 8] = sin;
      e[o + 9] = 0;
      e[o + 10] = cos;
      e[o + 11] = 0;
      e[o + 12] = c.x;
      e[o + 13] = bob;
      e[o + 14] = c.z;
      e[o + 15] = 1;
    }
    set.mesh.instanceMatrix.needsUpdate = true;
    // Keep cops visible near player; unused live read avoids tree-shake of import in some builds.
    void live.x;
  });

  return <primitive object={set.mesh} />;
}
