"use client";

import { useEffect, useMemo } from "react";
import { applyQuality, loadQualityPreference, quality } from "@/game/quality";
import { live, runtime } from "@/game/runtime";
import { toast, useGame } from "@/game/store";
import { StaticGrid } from "@/lib/spatial";
import { CITIES } from "@/world/cities";
import { generateCity } from "@/world/generate";

/** Build city data once per city/meet and wire runtime grid + spawn. */
export function useGameCity() {
  const cityId = useGame((s) => s.cityId);
  const qualityId = useGame((s) => s.qualityId);
  const meetId = useGame((s) => s.meetId);

  const q = useMemo(() => {
    applyQuality(qualityId);
    return quality.active;
  }, [qualityId]);

  const city = useMemo(() => {
    applyQuality(loadQualityPreference());
    const data = generateCity(CITIES[cityId]);
    const meet = meetId ? data.meets.find((m) => m.spec.id === meetId) : null;
    if (meet) {
      data.spawn = { x: meet.x + 3.5, z: meet.z + 3.5, yaw: Math.PI / 2 };
      queueMicrotask(() => toast(`Meet: ${meet.spec.label} — ${meet.spec.blurb}`));
    }
    // Guarantee a few enterable rides next to spawn (freeroam).
    const yaw = data.spawn.yaw;
    const side = yaw + Math.PI / 2;
    for (let i = 0; i < 3; i += 1) {
      const along = 4 + i * 3.2;
      data.parked.push({
        x: data.spawn.x + Math.sin(yaw) * along + Math.cos(side) * 2.2,
        z: data.spawn.z + Math.cos(yaw) * along - Math.sin(side) * 2.2,
        rot: yaw + Math.PI,
        s: 1,
        v: i,
        kind: (i === 0 ? 0 : i === 1 ? 1 : 2) as 0 | 1 | 2,
      });
    }
    return data;
  }, [cityId, meetId]);

  // Re-bind every mount — Strict Mode cleanup can null runtime while useMemo stays cached.
  useEffect(() => {
    runtime.city = city;
    runtime.grid = new StaticGrid(city.boxes, city.circles, city.bounds);
    live.x = city.spawn.x;
    live.z = city.spawn.z;
    live.yaw = city.spawn.yaw;
    return () => {
      if (runtime.city === city) {
        runtime.city = null;
        runtime.grid = null;
      }
    };
  }, [city]);

  return { city, cityId, q };
}
