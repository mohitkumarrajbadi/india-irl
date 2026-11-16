"use client";

import { useEffect, useMemo } from "react";
import { applyQuality, QUALITY_PRESETS, quality } from "@/game/quality";
import { live, runtime } from "@/game/runtime";
import { isWorldFullEnabled, isWorldV1Enabled } from "@/game/sim/flags";
import { toast, useGame } from "@/game/store";
import { StaticGrid } from "@/lib/spatial";
import { setClaimCity } from "@/net/vehicle-claims";
import { CITIES } from "@/world/cities";
import { generateCity } from "@/world/generate";
import { generateWorld } from "@/world/generate-world";

/** Build city or unified world data and wire runtime grid + spawn. */
export function useGameCity() {
  const cityId = useGame((s) => s.cityId);
  const qualityId = useGame((s) => s.qualityId);
  const qualityTier = useGame((s) => s.qualityTier);
  const meetId = useGame((s) => s.meetId);
  const destId = useGame((s) => s.destId);
  const worldV1 = isWorldV1Enabled();
  const worldFull = isWorldFullEnabled();

  useEffect(() => {
    applyQuality(qualityId);
    useGame.setState({ qualityTier: quality.active.id });
  }, [qualityId]);

  const q = QUALITY_PRESETS[qualityTier] ?? quality.active;

  const city = useMemo(() => {
    if (worldV1) {
      const data = generateWorld({
        mode: worldFull ? "full" : "prototype",
        destId,
        cityId,
        meetId,
      });
      const hub = data.config.hubs.find((h) => h.startsWith("dest:"));
      const label = hub?.slice(5) ?? "OMMO";
      queueMicrotask(() => toast(`Entering OMMO · ${label.replace(/-/g, " ")}`));
      return data;
    }

    const data = generateCity(CITIES[cityId]);
    const meet = meetId ? data.meets.find((m) => m.spec.id === meetId) : null;
    if (meet) {
      data.spawn = { x: meet.x + 3.5, z: meet.z + 3.5, yaw: Math.PI / 2 };
      queueMicrotask(() => toast(`Meet: ${meet.spec.label} — ${meet.spec.blurb}`));
    }
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
  }, [cityId, meetId, destId, worldV1, worldFull]);

  useEffect(() => {
    runtime.city = city;
    runtime.grid = new StaticGrid(city.boxes, city.circles, city.bounds);
    setClaimCity(city);
    live.x = city.spawn.x;
    live.z = city.spawn.z;
    live.yaw = city.spawn.yaw;
    return () => {
      if (runtime.city === city) {
        runtime.city = null;
        runtime.grid = null;
        setClaimCity(null);
      }
    };
  }, [city]);

  /** Stable canvas key: world mode never remounts when changing destination region. */
  const canvasKey = worldV1 ? "ommo-world" : city.config.id;

  return { city, cityId, q, canvasKey, worldV1 };
}
