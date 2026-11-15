"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { env, gameHour, updateEnv } from "@/gfx/env";
import { makeHillGeometry, makeSkyMaterial } from "@/gfx/materials";
import { quality } from "@/game/quality";
import { live } from "@/game/runtime";
import { tickWeather, weather } from "@/game/weather";
import { terrainProfile } from "@/world/terrain-profile";
import type { CityConfig } from "@/world/types";

/** Sky dome, horizon hills, fog, and the sun/moon rig. Everything reads one `env` struct. */
export function Atmosphere({ config }: { config: CityConfig }) {
  const { scene, camera } = useThree();
  const sky = useRef<THREE.Mesh>(null);
  const hills = useRef<THREE.Mesh>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const haze = useMemo(() => new THREE.Color(config.skyline.haze), [config]);
  const hillTint = useMemo(() => new THREE.Color(config.skyline.hillColor), [config]);
  const rainFog = useMemo(() => new THREE.Color("#8a9aaa"), []);

  const skyMat = useMemo(() => makeSkyMaterial(), []);
  const hillGeo = useMemo(() => {
    const boost = terrainProfile(config.id).skyBoost;
    return makeHillGeometry(Math.min(1, config.skyline.hills + boost), config.seed % 97);
  }, [config]);
  const hillMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#789", side: THREE.BackSide, fog: false }), []);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0xaabbcc, quality.active.fogDensity);
    return () => {
      scene.fog = null;
      skyMat.dispose();
      hillGeo.dispose();
      hillMat.dispose();
    };
  }, [scene, skyMat, hillGeo, hillMat]);

  useFrame((state, delta) => {
    const hour = gameHour();
    tickWeather(Math.min(delta, 0.05), hour, config.id);
    const e = updateEnv(hour, haze, hillTint);
    const q = quality.active;
    live.hour = e.hour;
    skyMat.uniforms.uTime.value = state.clock.elapsedTime;

    if (scene.fog) {
      const fog = scene.fog as THREE.FogExp2;
      fog.color.copy(e.fog).lerp(rainFog, weather.fog * 0.55);
      fog.density = q.fogDensity * (1 + weather.fog * 2.4 + weather.rain * 0.6);
    }
    sky.current?.position.copy(camera.position);
    if (hills.current) {
      hills.current.position.set(camera.position.x, 0, camera.position.z);
      hillMat.color.copy(e.hills);
    }

    const s = sun.current;
    if (s) {
      s.castShadow = q.shadows;
      // Snap to the shadow texel grid so shadows do not crawl as you walk.
      const map = q.shadowMap;
      const range = q.shadowRange;
      const step = (range * 2) / Math.max(map, 1);
      const tx = Math.round(live.x / step) * step;
      const tz = Math.round(live.z / step) * step;
      target.position.set(tx, 0, tz);
      s.position.set(tx + e.lightDir.x * 90, e.lightDir.y * 90, tz + e.lightDir.z * 90);
      s.color.copy(e.lightColor);
      s.intensity = e.lightIntensity * (1 - weather.cloud * 0.55);
      if (q.shadows) {
        const cam = s.shadow.camera;
        cam.left = -range;
        cam.right = range;
        cam.top = range;
        cam.bottom = -range;
        if (s.shadow.mapSize.x !== map) {
          s.shadow.mapSize.set(map, map);
          s.shadow.map?.dispose();
          s.shadow.map = null;
        }
        cam.updateProjectionMatrix();
      }
    }
    if (hemi.current) {
      hemi.current.color.copy(e.hemiSky);
      hemi.current.groundColor.copy(e.hemiGround);
      hemi.current.intensity = e.hemiIntensity;
    }
    if (ambient.current) ambient.current.intensity = e.ambient;
  });

  return (
    <>
      <mesh ref={sky} material={skyMat} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[400, 32, 16]} />
      </mesh>
      <mesh ref={hills} geometry={hillGeo} material={hillMat} frustumCulled={false} renderOrder={-9} />
      <hemisphereLight ref={hemi} />
      <ambientLight ref={ambient} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        castShadow={quality.active.shadows}
        shadow-mapSize-width={quality.active.shadowMap}
        shadow-mapSize-height={quality.active.shadowMap}
        shadow-camera-near={5}
        shadow-camera-far={220}
        shadow-camera-left={-quality.active.shadowRange}
        shadow-camera-right={quality.active.shadowRange}
        shadow-camera-top={quality.active.shadowRange}
        shadow-camera-bottom={-quality.active.shadowRange}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
    </>
  );
}
