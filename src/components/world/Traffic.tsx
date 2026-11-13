"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { glassMaterial, buildAuto, buildBike, buildBus, buildCar, buildTruck, type Model } from "@/vehicles/models";
import { TrafficSim } from "@/vehicles/traffic";
import { vertexMat } from "@/gfx/geo";
import { quality } from "@/game/quality";
import { live, obstacles, runtime } from "@/game/runtime";
import { sendTraffic, setTrafficHandler, useNet } from "@/net/store";
import type { CityData } from "@/world/types";

const CAR_TINTS = ["#f4f4f4", "#c9ccd1", "#2f3a4a", "#b3261e", "#1d4e89", "#e8e1cf", "#6b6e75", "#1f5d3a"].map((c) => new THREE.Color(c).getHex());
const BIKE_TINTS = ["#b3261e", "#1d4e89", "#1b1b1b", "#e2a02c", "#f4f4f4", "#2a7a5a", "#6a1b4d"].map((c) => new THREE.Color(c).getHex());
const TRUCK_TINTS = ["#2a6aa3", "#a5361f", "#2f7a3a", "#d89a2b"].map((c) => new THREE.Color(c).getHex());

function isTrafficHost(selfId: string, peerIds: string[]): boolean {
  let min = selfId;
  for (const id of peerIds) if (id < min) min = id;
  return min === selfId;
}

export function Traffic({ city }: { city: CityData }) {
  const counts = quality.active.traffic;
  const castShadows = quality.active.shadows;
  const sendAcc = useRef(0);
  const { sim, models, meshes } = useMemo(() => {
    const busTint = new THREE.Color(city.config.metro.color).getHex();
    const tints = [[0xffffff], BIKE_TINTS, CAR_TINTS, [busTint], TRUCK_TINTS];
    // City seed → same fleet tint/spawn choices across clients.
    const sim = new TrafficSim(city, counts, tints, city.config.seed);
    // Traffic always carries drivers/riders — empty shells look unnatural.
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
      body.castShadow = castShadows;
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
    return { sim, models, meshes };
  }, [city, counts, castShadows]);

  useEffect(() => {
    sim.seed(live.x, live.z);
    runtime.traffic = sim;
    setTrafficHandler((_from, packed) => {
      // Soft-correct toward the room host so cars stay roughly shared.
      for (let i = 0; i + 4 < packed.length; i += 5) {
        const idx = packed[i] | 0;
        const a = sim.agents[idx];
        if (!a) continue;
        const x = packed[i + 1];
        const z = packed[i + 2];
        const yaw = packed[i + 3];
        const speed = packed[i + 4];
        const d2 = (a.x - live.x) ** 2 + (a.z - live.z) ** 2;
        // Near the local player, trust local sim more so collisions feel solid.
        const blend = d2 < 35 * 35 ? 0.18 : d2 < 90 * 90 ? 0.45 : 0.85;
        a.x += (x - a.x) * blend;
        a.z += (z - a.z) * blend;
        a.yaw += (yaw - a.yaw) * blend;
        a.speed += (speed - a.speed) * blend;
      }
    });
    return () => {
      setTrafficHandler(null);
      runtime.traffic = null;
      for (const m of models) {
        m.body.dispose();
        m.glass?.dispose();
      }
    };
  }, [sim, models]);

  const peers = useNet((s) => s.peerMap);
  const peerIds = useNet((s) => s.peerIds);
  const selfId = useNet((s) => s.selfId);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    obstacles.length = 0;
    obstacles.push({ x: live.x, z: live.z, r: live.vehicle === 0 ? 0.5 : 1.2 });
    peers.forEach((p) => {
      if (!p.passenger) obstacles.push({ x: p.rx, z: p.rz, r: p.veh === 0 ? 0.5 : 1.2 });
    });

    sim.update(dt, live.x, live.z, obstacles);

    // Host publishes a compact nearby fleet snapshot ~2 Hz.
    sendAcc.current += dt;
    if (sendAcc.current > 0.5 && selfId && isTrafficHost(selfId, peerIds)) {
      sendAcc.current = 0;
      const packed: number[] = [];
      for (let i = 0; i < sim.agents.length; i += 1) {
        const a = sim.agents[i];
        const d2 = (a.x - live.x) ** 2 + (a.z - live.z) ** 2;
        if (d2 > 140 * 140) continue;
        packed.push(i, Math.round(a.x * 10) / 10, Math.round(a.z * 10) / 10, Math.round(a.yaw * 100) / 100, Math.round(a.speed * 10) / 10);
        if (packed.length >= 5 * 24) break;
      }
      sendTraffic(packed);
    }

    const idx = [0, 0, 0, 0, 0];
    for (const a of sim.agents) {
      const k = a.kind;
      const i = idx[k]++;
      const sin = Math.sin(a.yaw);
      const cos = Math.cos(a.yaw);
      const { body, glass } = meshes[k];
      const e = body.instanceMatrix.array as Float32Array;
      const o = i * 16;
      e[o] = cos; e[o + 1] = 0; e[o + 2] = -sin; e[o + 3] = 0;
      e[o + 4] = 0; e[o + 5] = 1; e[o + 6] = 0; e[o + 7] = 0;
      e[o + 8] = sin; e[o + 9] = 0; e[o + 10] = cos; e[o + 11] = 0;
      e[o + 12] = a.x; e[o + 13] = 0; e[o + 14] = a.z; e[o + 15] = 1;
      if (glass) (glass.instanceMatrix.array as Float32Array).set(e.subarray(o, o + 16), o);
    }
    for (let k = 0; k < meshes.length; k += 1) {
      const { body, glass } = meshes[k];
      body.instanceMatrix.needsUpdate = true;
      if (glass) glass.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {meshes.map((m, k) => (
        <group key={k}>
          <primitive object={m.body} />
          {m.glass ? <primitive object={m.glass} /> : null}
        </group>
      ))}
    </>
  );
}
