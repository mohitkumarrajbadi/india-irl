"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { weather } from "@/game/weather";
import { quality } from "@/game/quality";
import { live } from "@/game/runtime";

const COUNT = { low: 400, medium: 900, high: 1600 } as const;

/** Camera-following rain streaks — quality-gated. */
export function Rain() {
  const set = useMemo(() => {
    const n = COUNT[quality.active.id];
    const positions = new Float32Array(n * 3);
    const speeds = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 48;
      positions[i * 3 + 1] = Math.random() * 28;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 48;
      speeds[i] = 14 + Math.random() * 18;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: "#c8d8ee",
      size: 0.08,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return { points, positions, speeds, mat, geo, n };
  }, []);

  useEffect(
    () => () => {
      set.geo.dispose();
      set.mat.dispose();
    },
    [set],
  );

  useFrame((_, dt) => {
    const rain = weather.rain;
    set.mat.opacity = rain < 0.05 ? 0 : Math.min(0.85, 0.25 + rain * 0.7);
    set.points.visible = rain >= 0.05;
    if (rain < 0.05) return;

    const { positions, speeds, n } = set;
    const fall = Math.min(dt, 0.05);
    const wind = 1.8 + rain * 2.5;
    for (let i = 0; i < n; i += 1) {
      const o = i * 3;
      positions[o + 1]! -= speeds[i]! * (0.7 + rain) * fall;
      positions[o]! -= wind * fall * 0.35;
      if (positions[o + 1]! < 0) {
        positions[o]! = (Math.random() - 0.5) * 48;
        positions[o + 1]! = 18 + Math.random() * 12;
        positions[o + 2]! = (Math.random() - 0.5) * 48;
      }
    }
    set.geo.attributes.position!.needsUpdate = true;
    set.points.position.set(live.x, 0, live.z);
  });

  return <primitive object={set.points} />;
}
