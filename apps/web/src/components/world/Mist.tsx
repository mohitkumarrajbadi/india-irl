"use client";

/** Low ground mist / haze discs — denser in fog & rain. */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mistOpacity } from "@/gfx/atmosphere-fx";
import { env } from "@/gfx/env";
import { weather } from "@/game/weather";
import { live } from "@/game/runtime";
import { quality } from "@/game/quality";

const N = { low: 12, medium: 20, high: 28 } as const;

export function Mist() {
  const group = useRef<THREE.Group>(null);
  const set = useMemo(() => {
    const n = N[quality.active.id];
    const geo = new THREE.PlaneGeometry(18, 18);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: "#b8c4d4",
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    const dummy = new THREE.Object3D();
    const offsets: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < n; i += 1) {
      const ang = (i / n) * Math.PI * 2 + Math.random();
      const r = 8 + Math.random() * 28;
      offsets.push({ x: Math.cos(ang) * r, z: Math.sin(ang) * r, s: 0.7 + Math.random() * 0.8 });
    }
    return { mesh, mat, geo, dummy, offsets, n };
  }, []);

  useEffect(
    () => () => {
      set.geo.dispose();
      set.mat.dispose();
    },
    [set],
  );

  useFrame((state) => {
    const op = mistOpacity(weather.fog, weather.rain, env.night);
    set.mat.opacity = op;
    set.mesh.visible = op > 0.02;
    if (op <= 0.02) return;
    const t = state.clock.elapsedTime * 0.08;
    for (let i = 0; i < set.n; i += 1) {
      const o = set.offsets[i]!;
      const drift = Math.sin(t + i) * 2;
      set.dummy.position.set(live.x + o.x + drift, 0.35 + (i % 3) * 0.12, live.z + o.z);
      set.dummy.scale.setScalar(o.s * (0.9 + weather.fog * 0.4));
      set.dummy.updateMatrix();
      set.mesh.setMatrixAt(i, set.dummy.matrix);
    }
    set.mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={set.mesh} />;
}
