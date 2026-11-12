"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { vertexMat } from "@/gfx/geo";
import { makeInstanced } from "@/gfx/instancing";
import { metroCoach, metroDeck, metroPillar, metroStation } from "@/gfx/props";
import type { CityData } from "@/world/types";

const PILLAR_H = 8.4;
const DECK_Y = 9.5;
const RAIL_Y = 10.0;
const COACH = 17.8;

/** Elevated metro: viaduct, stations, and a train shuttling end to end. */
export function Metro({ city }: { city: CityData }) {
  const train = useRef<THREE.Group>(null);
  const along = useRef({ u: 0, dir: 1 });

  const set = useMemo(() => {
    const { metroLine: l, metroPillars, metroSegments } = city;
    const color = city.config.metro.color;
    const alongX = city.config.metro.axis === "z";
    const rotY = alongX ? Math.PI / 2 : 0;
    const dx = l.x1 - l.x0;
    const dz = l.z1 - l.z0;
    const length = Math.hypot(dx, dz);

    const pillarGeo = metroPillar(PILLAR_H);
    const pillars = makeInstanced(pillarGeo, vertexMat, metroPillars.length, (i, o) => {
      o.position.set(metroPillars[i].x, 0, metroPillars[i].z);
      o.rotation.y = rotY;
    }, { cast: true, receive: true });

    const deckGeo = metroDeck(length + 28, color);
    const deck = new THREE.Mesh(deckGeo, vertexMat);
    deck.position.set((l.x0 + l.x1) / 2, DECK_Y, (l.z0 + l.z1) / 2);
    deck.rotation.y = rotY;
    deck.castShadow = true;
    deck.receiveShadow = true;

    const stationGeo = metroStation(color);
    const stations = makeInstanced(stationGeo, vertexMat, metroSegments.length, (i, o) => {
      const s = metroSegments[i];
      o.position.set((s.x0 + s.x1) / 2, DECK_Y + 0.3, (s.z0 + s.z1) / 2);
      o.rotation.y = rotY;
    }, { cast: true, receive: true });

    const coachGeo = metroCoach(color);
    const cars = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(coachGeo, vertexMat);
      m.castShadow = true;
      return m;
    });
    return { pillars, deck, stations, cars, length, rotY, geos: [pillarGeo, deckGeo, stationGeo, coachGeo] };
  }, [city]);

  useEffect(() => {
    const g = train.current;
    if (!g) return;
    set.cars.forEach((c, k) => {
      c.position.set(0, 0, (k - 1) * COACH);
      g.add(c);
    });
    return () => set.cars.forEach((c) => c.removeFromParent());
  }, [set]);

  useEffect(
    () => () => {
      set.geos.forEach((g) => g.dispose());
      set.pillars.dispose();
      set.stations.dispose();
    },
    [set],
  );

  useFrame((_, delta) => {
    const g = train.current;
    if (!g) return;
    const { metroLine: l } = city;
    const a = along.current;
    const margin = 30;
    const span = set.length + 2 * margin;
    // Ease in and out at each terminus.
    const t = a.u / span;
    const ease = Math.min(1, Math.sin(Math.PI * Math.max(0.0001, Math.min(1, t))) * 6 + 0.12);
    a.u += a.dir * 18 * ease * delta;
    if (a.u >= span) {
      a.u = span;
      a.dir = -1;
    } else if (a.u <= 0) {
      a.u = 0;
      a.dir = 1;
    }
    const ux = set.length > 0 ? (l.x1 - l.x0) / set.length : 0;
    const uz = set.length > 0 ? (l.z1 - l.z0) / set.length : 1;
    const s = a.u - margin;
    g.position.set(l.x0 + ux * s, RAIL_Y, l.z0 + uz * s);
    g.rotation.y = Math.atan2(ux * a.dir, uz * a.dir);
  });

  return (
    <>
      <primitive object={set.pillars} />
      <primitive object={set.deck} />
      <primitive object={set.stations} />
      <group ref={train} />
    </>
  );
}
