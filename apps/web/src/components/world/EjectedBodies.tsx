"use client";

/** Tumbling rider/pillion figures after a bike smash. */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { vertexMat } from "@/gfx/geo";
import { buildBikePillion } from "@/vehicles/models";
import type { EjectedBodyPool } from "@/vehicles/ejected-bodies";

export function EjectedBodies({ pool }: { pool: EjectedBodyPool }) {
  const { mesh, dummy } = useMemo(() => {
    const model = buildBikePillion();
    const mesh = new THREE.InstancedMesh(model.body, vertexMat, pool.bodies.length);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = pool.bodies.length;
    const dummy = new THREE.Object3D();
    dummy.position.set(0, -80, 0);
    dummy.scale.setScalar(0.001);
    dummy.updateMatrix();
    for (let i = 0; i < pool.bodies.length; i += 1) mesh.setMatrixAt(i, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    return { mesh, dummy, geo: model.body };
  }, [pool]);

  useEffect(
    () => () => {
      mesh.dispose();
      mesh.geometry.dispose();
    },
    [mesh],
  );

  useFrame((_, dt) => {
    pool.tick(Math.min(dt, 0.05));
    for (let i = 0; i < pool.bodies.length; i += 1) {
      const b = pool.bodies[i]!;
      if (!b.alive) {
        dummy.position.set(0, -80, 0);
        dummy.scale.setScalar(0.001);
        dummy.rotation.set(0, 0, 0);
      } else {
        const fade = 1 - b.life / b.maxLife;
        dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(b.spin * 0.4, b.yaw, b.spin * 0.55);
        dummy.scale.setScalar(0.85 + fade * 0.15);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
