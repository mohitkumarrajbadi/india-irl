"use client";

/** Pooled debris chunks for smashed roadside props. */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { DestructibleSim } from "@/game/destructible-sim";

const COLORS: Record<string, string> = {
  wood: "#8a5a34",
  plastic: "#4a8ab8",
  metal: "#8a9098",
  organic: "#3a6a38",
};

export function DestructibleDebris({ sim }: { sim: DestructibleSim }) {
  const { mesh, dummy, color } = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.15 });
    const mesh = new THREE.InstancedMesh(geo, mat, sim.debris.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = sim.debris.length;
    const colors = new Float32Array(sim.debris.length * 3);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    const hide = new THREE.Object3D();
    hide.position.set(0, -80, 0);
    hide.scale.setScalar(0.001);
    hide.updateMatrix();
    for (let i = 0; i < sim.debris.length; i += 1) mesh.setMatrixAt(i, hide.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    return { mesh, dummy: new THREE.Object3D(), color: new THREE.Color(), geo, mat };
  }, [sim]);

  useEffect(
    () => () => {
      mesh.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.geometry.dispose();
    },
    [mesh],
  );

  useFrame(() => {
    let alive = 0;
    for (let i = 0; i < sim.debris.length; i += 1) {
      const d = sim.debris[i]!;
      if (!d.alive) {
        // Park far below — identity leftover slots were white cubes on the road
        dummy.position.set(0, -80, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
      } else {
        alive += 1;
        const fade = 1 - d.life / d.maxLife;
        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.spin, d.spin * 0.7, d.spin * 0.4);
        dummy.scale.setScalar(d.scale * (0.55 + fade * 0.45));
        color.set(COLORS[d.material] ?? "#888");
        mesh.setColorAt(i, color);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    // Keep instance budget fixed; skip color upload when pool is idle.
    mesh.instanceMatrix.needsUpdate = true;
    if (alive > 0 && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
