"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { live } from "@/game/runtime";
import { isWorldData } from "@/world/generate-world";
import {
  sliceCityVisuals,
  streamCellFingerprint,
  streamRingForSpeed,
} from "@/world/visual-stream";
import type { CityData } from "@/world/types";
import { CityBuildings } from "./CityBuildings";
import { CityProps } from "./CityProps";

/**
 * When playing the unified world, only nearby building/prop chunks are mounted.
 * Island cities keep full eager meshes.
 */
export function StreamedCityLayer({ city }: { city: CityData }) {
  const world = isWorldData(city);
  const [view, setView] = useState(() =>
    world ? sliceCityVisuals(city, live.x, live.z, live.speed) : city,
  );
  const fp = useRef("");

  useFrame(() => {
    if (!world) return;
    const ring = streamRingForSpeed(live.speed);
    const next = streamCellFingerprint(live.x, live.z, ring);
    if (next === fp.current) return;
    fp.current = next;
    setView(sliceCityVisuals(city, live.x, live.z, live.speed, ring));
  });

  const data = world ? view : city;
  return (
    <>
      <CityBuildings city={data} />
      <CityProps city={data} />
    </>
  );
}
