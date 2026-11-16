"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { env } from "@/gfx/env";
import { vertexMat } from "@/gfx/geo";
import { QUALITY_PRESETS, quality } from "@/game/quality";
import { live, obstacles, runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { setTrafficHandler, useNet } from "@/net/store";
import { glassMaterial, buildAuto, buildBike, buildBus, buildCar, buildTruck, type Model } from "@/vehicles/models";
import { TrafficSim } from "@/vehicles/traffic";
import type { CityData } from "@/world/types";
import { createTrafficLights, writeTrafficLights } from "./traffic-lights";
import { writeTrafficMatrices } from "./traffic-matrices";
import { appendCrossingPedObstacles } from "@/vehicles/traffic-ped-yield";
import { applyTrafficSnapshot, isTrafficHost, publishTrafficSnapshot } from "./traffic-sync";

const CAR_TINTS = ["#f4f4f4", "#c9ccd1", "#2f3a4a", "#b3261e", "#1d4e89", "#e8e1cf", "#6b6e75", "#1f5d3a"].map((c) => new THREE.Color(c).getHex());
const BIKE_TINTS = ["#b3261e", "#1d4e89", "#1b1b1b", "#e2a02c", "#f4f4f4", "#2a7a5a", "#6a1b4d"].map((c) => new THREE.Color(c).getHex());
const TRUCK_TINTS = ["#2a6aa3", "#a5361f", "#2f7a3a", "#d89a2b"].map((c) => new THREE.Color(c).getHex());

export function Traffic({ city }: { city: CityData }) {
  // Fleet size follows preference (stable) — auto tier flaps must not remount / despawn cars
  const qualityId = useGame((s) => s.qualityId);
  const tier = useGame((s) => s.qualityTier);
  const fleetTier = qualityId === "auto" ? "medium" : qualityId;
  const counts = (QUALITY_PRESETS[fleetTier] ?? quality.active).traffic;
  const castShadows = (QUALITY_PRESETS[tier] ?? quality.active).shadows;
  const sendAcc = useRef(0);
  const { sim, models, meshes, lights } = useMemo(() => {
    const busTint = new THREE.Color(city.config.metro.color).getHex();
    const tints = [[0xffffff], BIKE_TINTS, CAR_TINTS, [busTint], TRUCK_TINTS];
    const sim = new TrafficSim(city, counts, tints, city.config.seed);
    sim.seed(live.x, live.z, live.yaw);
    const models: Model[] = [
      buildAuto(city.config.livery.auto, { occupied: true }),
      buildBike({ occupied: true }),
      buildCar(null, { occupied: true }),
      buildBus({ occupied: true }),
      buildTruck({ occupied: true }),
    ];
    const meshes = models.map((model, k) => {
      const body = new THREE.InstancedMesh(model.body, vertexMat, counts[k]);
      body.frustumCulled = false;
      body.castShadow = false;
      body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      let slot = 0;
      for (const a of sim.agents) if (a.kind === k) body.setColorAt(slot++, new THREE.Color(a.tint));
      let glass: THREE.InstancedMesh | null = null;
      if (model.glass) {
        glass = new THREE.InstancedMesh(model.glass, glassMaterial, counts[k]);
        glass.frustumCulled = false;
        glass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        glass.renderOrder = 2;
      }
      return { body, glass };
    });
    const lights = createTrafficLights(counts, 4);
    return { sim, models, meshes, lights };
  }, [city, counts]);

  useEffect(() => {
    for (const { body } of meshes) body.castShadow = castShadows;
  }, [meshes, castShadows]);

  useEffect(() => {
    runtime.traffic = sim;
    setTrafficHandler((_from, packed) => applyTrafficSnapshot(sim, packed));
    return () => {
      setTrafficHandler(null);
      runtime.traffic = null;
      for (const m of models) {
        m.body.dispose();
        m.glass?.dispose();
      }
      lights.dispose();
    };
  }, [sim, models, lights]);

  const peers = useNet((s) => s.peerMap);
  const peerIds = useNet((s) => s.peerIds);
  const selfId = useNet((s) => s.selfId);

  // Roadside props NPCs should brake for (stalls, parked, stands, signals, …)
  const roadside = useMemo(() => {
    const out: { x: number; z: number; r: number }[] = [];
    for (const c of city.circles) {
      if (c.r < 0.35) continue;
      out.push({ x: c.x, z: c.z, r: c.r });
    }
    for (const b of city.boxes) {
      const w = b.maxX - b.minX;
      const d = b.maxZ - b.minZ;
      if (w > 8 || d > 8) continue; // skip building footprints
      out.push({ x: (b.minX + b.maxX) * 0.5, z: (b.minZ + b.maxZ) * 0.5, r: Math.max(w, d) * 0.55 });
    }
    return out;
  }, [city]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    obstacles.length = 0;
    const selfR = live.vehicle === 0 ? 0.5 : Math.abs(live.speed) > 4 ? 0.55 : 1.05;
    obstacles.push({ x: live.x, z: live.z, r: selfR });
    peers.forEach((p) => {
      if (!p.passenger) obstacles.push({ x: p.rx, z: p.rz, r: p.veh === 0 ? 0.5 : 1.05 });
    });
    // Near the player — far agents respawn anyway; avoids feeding thousands of props
    const R2 = 70 * 70;
    for (const o of roadside) {
      const dx = o.x - live.x;
      const dz = o.z - live.z;
      if (dx * dx + dz * dz < R2) obstacles.push(o);
    }
    runtime.animals?.pushObstacles(obstacles, live.x, live.z);
    const pedList = runtime.peds?.peds;
    if (pedList) appendCrossingPedObstacles(obstacles, pedList, live.x, live.z);

    sim.update(dt, live.x, live.z, obstacles, live.yaw);

    sendAcc.current += dt;
    if (sendAcc.current > 0.5 && selfId && isTrafficHost(selfId, peerIds)) {
      sendAcc.current = 0;
      publishTrafficSnapshot(sim);
    }
    writeTrafficMatrices(sim, meshes);
    writeTrafficLights(sim, lights, env.night, live.x, live.z);
  });

  return (
    <>
      {meshes.map((m, k) => (
        <group key={k}>
          <primitive object={m.body} />
          {m.glass ? <primitive object={m.glass} /> : null}
        </group>
      ))}
      <primitive object={lights.heads} />
      <primitive object={lights.tails} />
      <primitive object={lights.ambers} />
      <primitive object={lights.beamsRoot} />
    </>
  );
}
