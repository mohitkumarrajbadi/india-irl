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
import {
  glassMaterial,
  buildAuto,
  buildBike,
  buildBikePillion,
  buildBus,
  buildCar,
  buildERickshaw,
  buildJeep,
  buildMotorcycle,
  buildSuv,
  buildTaxi,
  buildTempo,
  buildTruck,
  buildVan,
  type Model,
} from "@/vehicles/models";
import { EjectedBodyPool } from "@/vehicles/ejected-bodies";
import { setEjectedBodyPool } from "@/vehicles/traffic-tumble";
import { TrafficSim } from "@/vehicles/traffic";
import { vehicleRegistry } from "@/vehicles/vehicle-registry";
import type { CityData } from "@/world/types";
import { EjectedBodies } from "./EjectedBodies";
import { createTrafficLights, writeTrafficLights } from "./traffic-lights";
import { writePillionMatrices, writeTrafficMatrices } from "./traffic-matrices";
import { appendCrossingPedObstacles } from "@/vehicles/traffic-ped-yield";
import { applyTrafficSnapshot, isTrafficHost, publishTrafficSnapshot } from "./traffic-sync";

const CAR_TINTS = ["#f4f4f4", "#c9ccd1", "#2f3a4a", "#b3261e", "#1d4e89", "#e8e1cf", "#6b6e75", "#1f5d3a"].map((c) =>
  new THREE.Color(c).getHex(),
);
const BIKE_TINTS = ["#b3261e", "#1d4e89", "#1b1b1b", "#e2a02c", "#f4f4f4", "#2a7a5a", "#6a1b4d"].map((c) =>
  new THREE.Color(c).getHex(),
);
const TRUCK_TINTS = ["#2a6aa3", "#a5361f", "#2f7a3a", "#d89a2b"].map((c) => new THREE.Color(c).getHex());
const SUV_TINTS = ["#1b1b1b", "#f4f4f4", "#2f3a4a", "#5a4632", "#1d4e89", "#6b1f2a"].map((c) =>
  new THREE.Color(c).getHex(),
);
const VAN_TINTS = ["#e8e1cf", "#f4f4f4", "#1d4e89", "#c9ccd1", "#2a7a5a"].map((c) => new THREE.Color(c).getHex());
const JEEP_TINTS = ["#3d5c3a", "#5a4632", "#2f3a4a", "#c9a227", "#1b1b1b"].map((c) => new THREE.Color(c).getHex());
const TAXI_TINTS = ["#1a1a1a", "#222222", "#2a2a2a"].map((c) => new THREE.Color(c).getHex());
const E_AUTO_TINTS = ["#2f7a5a", "#1d6b4f", "#3a8f6a", "#245c48"].map((c) => new THREE.Color(c).getHex());

export function Traffic({ city }: { city: CityData }) {
  // Fleet follows locked preference (not auto flap) so cars don't remount mid-drive
  const qualityId = useGame((s) => s.qualityId);
  const tier = useGame((s) => s.qualityTier);
  const fleetTier = qualityId === "auto" ? "low" : qualityId;
  const preset = QUALITY_PRESETS[fleetTier] ?? quality.active;
  const counts = preset.traffic;
  const beamBudget = preset.trafficBeams;
  const castShadows = (QUALITY_PRESETS[tier] ?? quality.active).shadows;
  const sendAcc = useRef(0);
  const { sim, models, meshes, lights, pillionMesh, pillionSlots, ejectPool } = useMemo(() => {
    const busTint = new THREE.Color(city.config.metro.color).getHex();
    const tints = [
      [0xffffff],
      BIKE_TINTS,
      CAR_TINTS,
      [busTint],
      TRUCK_TINTS,
      BIKE_TINTS,
      SUV_TINTS,
      TRUCK_TINTS,
      VAN_TINTS,
      JEEP_TINTS,
      TAXI_TINTS,
      E_AUTO_TINTS,
    ];
    const sim = new TrafficSim(city, counts, tints, city.config.seed);
    sim.seed(live.x, live.z, live.yaw);
    vehicleRegistry.registerTraffic(sim.agents);
    const models: Model[] = [
      buildAuto(city.config.livery.auto, { occupied: true }),
      buildBike({ occupied: true }),
      buildCar(null, { occupied: true }),
      buildBus({ occupied: true }),
      buildTruck({ occupied: true }),
      buildMotorcycle({ occupied: true }),
      buildSuv({ occupied: true }),
      buildTempo({ occupied: true }),
      buildVan({ occupied: true }),
      buildJeep({ occupied: true }),
      buildTaxi({ occupied: true }),
      buildERickshaw({ occupied: true }),
    ];
    const meshes = models.map((model, k) => {
      const n = Math.max(1, counts[k] ?? 1);
      const body = new THREE.InstancedMesh(model.body, vertexMat, n);
      body.frustumCulled = false;
      body.castShadow = false;
      body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      let slot = 0;
      for (const a of sim.agents) if (a.kind === k) body.setColorAt(slot++, new THREE.Color(a.tint));
      let glass: THREE.InstancedMesh | null = null;
      if (model.glass) {
        glass = new THREE.InstancedMesh(model.glass, glassMaterial, n);
        glass.frustumCulled = false;
        glass.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        glass.renderOrder = 2;
      }
      return { body, glass };
    });
    const pillionSlots = (counts[1] ?? 0) + (counts[5] ?? 0);
    const pillionModel = buildBikePillion();
    const pillionMesh = new THREE.InstancedMesh(pillionModel.body, vertexMat, Math.max(1, pillionSlots));
    pillionMesh.frustumCulled = false;
    pillionMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const lights = createTrafficLights(counts, beamBudget);
    const ejectPool = new EjectedBodyPool();
    return { sim, models, meshes, lights, pillionMesh, pillionSlots, ejectPool };
  }, [city, counts, beamBudget]);

  useEffect(() => {
    for (const { body } of meshes) body.castShadow = castShadows;
  }, [meshes, castShadows]);

  useEffect(() => {
    runtime.traffic = sim;
    setEjectedBodyPool(ejectPool);
    setTrafficHandler((_from, packed) => applyTrafficSnapshot(sim, packed));
    return () => {
      setTrafficHandler(null);
      setEjectedBodyPool(null);
      runtime.traffic = null;
      for (const m of models) {
        m.body.dispose();
        m.glass?.dispose();
      }
      pillionMesh.dispose();
      pillionMesh.geometry.dispose();
      lights.dispose();
    };
  }, [sim, models, lights, pillionMesh, ejectPool]);

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
    writePillionMatrices(sim, pillionMesh, pillionSlots);
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
      <primitive object={pillionMesh} />
      <EjectedBodies pool={ejectPool} />
      <primitive object={lights.heads} />
      <primitive object={lights.tails} />
      <primitive object={lights.ambers} />
      <primitive object={lights.beamsRoot} />
    </>
  );
}
