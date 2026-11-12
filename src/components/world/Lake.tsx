"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { env, nightUniform } from "@/gfx/env";
import { vertexMat } from "@/gfx/geo";
import { cableBridge } from "@/gfx/landmarks";
import { WALK } from "@/world/generate";
import type { CityData } from "@/world/types";

export function Lake({ city }: { city: CityData }) {
  const lake = city.lake;
  const set = useMemo(() => {
    if (!lake) return null;
    const material = new THREE.ShaderMaterial({
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uHorizon: { value: env.horizon },
          uZenith: { value: env.zenith },
          uSunDir: { value: env.sunDir },
          uNight: nightUniform,
        },
      ]),
      vertexShader: /* glsl */ `
        varying vec3 vWPos;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWPos = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSunDir;
        uniform float uTime; uniform float uNight;
        varying vec3 vWPos;
        #include <fog_pars_fragment>
        void main() {
          vec3 V = normalize(cameraPosition - vWPos);
          vec2 p = vWPos.xz * 0.35;
          float a = sin(p.x * 1.7 + uTime * 1.1) + sin(p.y * 2.1 - uTime * 0.9) + sin((p.x + p.y) * 1.3 + uTime * 0.7);
          float b = sin(p.x * 2.3 - uTime) + sin(p.y * 1.1 + uTime * 1.3);
          vec3 N = normalize(vec3(a * 0.035, 1.0, b * 0.035));
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 base = mix(vec3(0.05, 0.2, 0.22), vec3(0.03, 0.08, 0.11), uNight);
          vec3 refl = mix(uHorizon, uZenith, 0.45);
          vec3 col = mix(base, refl, 0.22 + 0.78 * fres);
          vec3 R = reflect(-V, N);
          float s = pow(max(dot(R, normalize(uSunDir)), 0.0), 140.0);
          col += vec3(1.0, 0.9, 0.7) * s * (1.0 - uNight) * 1.6;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const w = lake.maxX - lake.minX;
    const d = lake.maxZ - lake.minZ;
    const plane = new THREE.PlaneGeometry(w, d);
    const bridgeGeo = cableBridge(w + WALK * 2);
    return { material, plane, bridgeGeo, w };
  }, [lake]);

  useEffect(
    () => () => {
      set?.material.dispose();
      set?.plane.dispose();
      set?.bridgeGeo.dispose();
    },
    [set],
  );

  useFrame((state) => {
    if (set) set.material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  if (!lake || !set) return null;
  const cx = (lake.minX + lake.maxX) / 2;
  const cz = (lake.minZ + lake.maxZ) / 2;
  return (
    <group>
      <mesh geometry={set.plane} material={set.material} position={[cx, 0.01, cz]} rotation-x={-Math.PI / 2} />
      <mesh geometry={set.bridgeGeo} material={vertexMat} position={[cx, 0, cz]} castShadow receiveShadow />
    </group>
  );
}
