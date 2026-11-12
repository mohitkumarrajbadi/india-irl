"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { env } from "@/gfx/env";
import { vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import {
  autoStand,
  busStop,
  chaiStall,
  cow,
  crane,
  flowerCart,
  fruitCart,
  glowDisc,
  lampPost,
  newsStand,
  roadsideShrine,
  speedBreaker,
  trafficSignal,
  waterTanker,
} from "@/gfx/props";
import { buildAuto, buildBike } from "@/vehicles/models";
import type { CityData } from "@/world/types";

const STALL_TINTS = ["#d9483b", "#f2c230", "#2f7fc4", "#3a9a5a"];
const COW_TINTS = ["#f1ece0", "#c9a77a", "#4a3a30"];
const BIKE_TINTS = ["#b3261e", "#1d4e89", "#1b1b1b", "#e2a02c", "#f4f4f4", "#2a7a5a", "#6a1b4d", "#7a4fb0"];

export function CityProps({ city }: { city: CityData }) {
  const set = useMemo(() => {
    const meshes: THREE.InstancedMesh[] = [];
    const disposables: { dispose(): void }[] = [];
    const add = (m: THREE.InstancedMesh) => {
      meshes.push(m);
      return m;
    };

    // Trees: one trunk mesh, one low-poly crown mesh tinted per instance.
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.17, 4, 6);
    trunkGeo.translate(0, 2, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: "#6a4a32", roughness: 0.95, flatShading: true });
    const crownGeo = new THREE.IcosahedronGeometry(1, 1);
    const crownMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true });
    add(makeInstanced(trunkGeo, trunkMat, city.trees.length, (i, o) => {
      const t = city.trees[i];
      o.position.set(t.x, 0, t.z);
      o.scale.set(t.s, t.s, t.s);
    }, { cast: true }));
    add(makeInstanced(crownGeo, crownMat, city.trees.length, (i, o) => {
      const t = city.trees[i];
      o.position.set(t.x, 5.2 * t.s, t.z);
      o.rotation.y = (i * 2.399) % 6.28;
      o.scale.set(1.8 * t.s, 1.4 * t.s, 1.8 * t.s);
    }, { cast: true, color: (i) => city.trees[i].color }));

    const shrubGeo = new THREE.IcosahedronGeometry(0.55, 0);
    const shrubMat = new THREE.MeshStandardMaterial({ color: "#3d7a3c", roughness: 1, flatShading: true });
    add(makeInstanced(shrubGeo, shrubMat, city.shrubs.length, (i, o) => {
      const s = city.shrubs[i];
      o.position.set(s.x, 0.34, s.z);
      o.scale.set(1.1 * s.s, 0.7 * s.s, 1.1 * s.s);
    }));

    // Street lamps.
    const lamp = lampPost();
    const lampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 });
    const headMat = new THREE.MeshBasicMaterial({ color: "#888888", fog: true });
    const poolGeo = new THREE.PlaneGeometry(10, 10);
    poolGeo.rotateX(-Math.PI / 2);
    const poolTex = glowDisc();
    const poolMat = new THREE.MeshBasicMaterial({
      map: poolTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    add(makeInstanced(lamp.post, lampMat, city.lamps.length, (i, o) => {
      const l = city.lamps[i];
      o.position.set(l.x, 0, l.z);
      o.rotation.y = l.rot;
    }, { cast: true }));
    add(makeInstanced(lamp.head, headMat, city.lamps.length, (i, o) => {
      const l = city.lamps[i];
      o.position.set(l.x, 0, l.z);
      o.rotation.y = l.rot;
    }));
    const pools = add(makeInstanced(poolGeo, poolMat, city.lamps.length, (i, o) => {
      const l = city.lamps[i];
      o.position.set(l.x + Math.sin(l.rot) * 1.9, 0.075, l.z + Math.cos(l.rot) * 1.9);
    }));
    pools.renderOrder = 3;

    // Roadside furniture.
    const stopGeo = busStop();
    add(makeInstanced(stopGeo, vertexMat, city.busStops.length, (i, o) => {
      const b = city.busStops[i];
      o.position.set(b.x, 0, b.z);
      o.rotation.y = b.rot;
    }, { cast: true, receive: true }));
    const stallGeo = chaiStall();
    add(makeInstanced(stallGeo, vertexMat, city.stalls.length, (i, o) => {
      const s = city.stalls[i];
      o.position.set(s.x, 0, s.z);
      o.rotation.y = s.rot + Math.PI;
    }, { cast: true, color: (i) => STALL_TINTS[city.stalls[i].v % STALL_TINTS.length] }));
    const cowGeo = cow();
    add(makeInstanced(cowGeo, vertexMat, city.cows.length, (i, o) => {
      const c = city.cows[i];
      o.position.set(c.x, 0, c.z);
      o.rotation.y = c.rot;
      o.scale.setScalar(c.s);
    }, { cast: true, color: (i) => COW_TINTS[city.cows[i].v % COW_TINTS.length] }));

    // City-flavoured street extras (fruit carts, shrines, cranes…).
    const byKind = (k: number) => city.extras.filter((e) => e.v === k);
    const placeExtra = (list: typeof city.extras) => (i: number, o: THREE.Object3D) => {
      o.position.set(list[i].x, 0, list[i].z);
      o.rotation.y = list[i].rot + Math.PI;
      o.scale.setScalar(list[i].s);
    };
    const fruit = byKind(0);
    const flowers = byKind(1);
    const shrines = byKind(2);
    const cranes = byKind(3);
    const news = byKind(4);
    const tankers = byKind(5);
    const signals = byKind(6);
    const breakers = byKind(7);
    const stands = byKind(8);
    const fruitGeo = fruitCart();
    const flowerGeo = flowerCart();
    const shrineGeo = roadsideShrine();
    const craneGeo = crane();
    const newsGeo = newsStand();
    const tankerGeo = waterTanker();
    const signalGeo = trafficSignal();
    const breakerGeo = speedBreaker();
    const standGeo = autoStand();
    add(makeInstanced(fruitGeo, vertexMat, fruit.length, placeExtra(fruit), { cast: true, receive: true }));
    add(makeInstanced(flowerGeo, vertexMat, flowers.length, placeExtra(flowers), { cast: true, receive: true }));
    add(makeInstanced(shrineGeo, vertexMat, shrines.length, placeExtra(shrines), { cast: true, receive: true }));
    add(makeInstanced(craneGeo, vertexMat, cranes.length, placeExtra(cranes), { cast: true }));
    add(makeInstanced(newsGeo, vertexMat, news.length, placeExtra(news), { cast: true, receive: true }));
    add(makeInstanced(tankerGeo, vertexMat, tankers.length, placeExtra(tankers), { cast: true, receive: true }));
    add(makeInstanced(signalGeo, vertexMat, signals.length, placeExtra(signals), { cast: true }));
    add(
      makeInstanced(breakerGeo, vertexMat, breakers.length, (i, o) => {
        o.position.set(breakers[i].x, 0, breakers[i].z);
        o.rotation.y = breakers[i].rot;
        o.scale.setScalar(breakers[i].s);
      }, { receive: true }),
    );
    add(makeInstanced(standGeo, vertexMat, stands.length, placeExtra(stands), { cast: true, receive: true }));

    // Parked bikes and autos at the kerb.
    const bikes = city.parked.filter((p) => p.kind === 0);
    const autos = city.parked.filter((p) => p.kind === 1);
    const bikeModel = buildBike();
    const autoModel = buildAuto(city.config.livery.auto);
    add(makeInstanced(bikeModel.body, vertexMat, bikes.length, (i, o) => {
      o.position.set(bikes[i].x, 0, bikes[i].z);
      o.rotation.y = bikes[i].rot;
    }, { cast: true, color: (i) => BIKE_TINTS[bikes[i].v % BIKE_TINTS.length] }));
    add(makeInstanced(autoModel.body, vertexMat, autos.length, (i, o) => {
      o.position.set(autos[i].x, 0, autos[i].z);
      o.rotation.y = autos[i].rot;
    }, { cast: true }));
    if (autoModel.glass) {
      const g = makeInstanced(autoModel.glass, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.4, roughness: 0.1 }), autos.length, (i, o) => {
        o.position.set(autos[i].x, 0, autos[i].z);
        o.rotation.y = autos[i].rot;
      });
      add(g);
    }

    disposables.push(
      trunkGeo,
      trunkMat,
      crownGeo,
      crownMat,
      shrubGeo,
      shrubMat,
      lamp.post,
      lamp.head,
      lampMat,
      headMat,
      poolGeo,
      poolTex,
      poolMat,
      stopGeo,
      stallGeo,
      cowGeo,
      fruitGeo,
      flowerGeo,
      shrineGeo,
      craneGeo,
      newsGeo,
      tankerGeo,
      signalGeo,
      breakerGeo,
      standGeo,
      bikeModel.body,
      autoModel.body,
    );
    return { meshes, disposables, headMat, poolMat, pools };
  }, [city]);

  useEffect(
    () => () => {
      set.disposables.forEach((d) => d.dispose());
      set.meshes.forEach((m) => m.dispose());
    },
    [set],
  );

  useFrame(() => {
    const n = env.night;
    set.headMat.color.setRGB(0.3 + 0.9 * n, 0.28 + 0.78 * n, 0.24 + 0.5 * n);
    set.poolMat.opacity = n * 0.55;
    set.pools.visible = n > 0.04;
  });

  return (
    <>
      {set.meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
}

