"use client";

import { useEffect, useMemo } from "react";
import { applyQuality, QUALITY_PRESETS, quality } from "@/game/quality";
import { live, runtime } from "@/game/runtime";
import { toast, useGame } from "@/game/store";
import { StaticGrid } from "@/lib/spatial";
import { setClaimCity } from "@/net/vehicle-claims";
import { vehicleRegistry } from "@/vehicles/vehicle-registry";
import { generateWorld } from "@/world/generate-world";

/** Build the unified OMMO world and wire runtime grid + spawn. */
export function useGameCity() {
  const cityId = useGame((s) => s.cityId);
  const qualityId = useGame((s) => s.qualityId);
  const qualityTier = useGame((s) => s.qualityTier);
  const meetId = useGame((s) => s.meetId);
  const destId = useGame((s) => s.destId);

  useEffect(() => {
    applyQuality(qualityId);
    useGame.setState({ qualityTier: quality.active.id });
  }, [qualityId]);

  const q = QUALITY_PRESETS[qualityTier] ?? quality.active;

  const city = useMemo(() => {
    const data = generateWorld({
      mode: "full",
      destId,
      cityId,
      meetId,
    });
    const hub = data.config.hubs.find((h) => h.startsWith("dest:"));
    const label = hub?.slice(5) ?? "OMMO";
    queueMicrotask(() => toast(`Entering OMMO · ${label.replace(/-/g, " ")}`));
    return data;
  }, [cityId, meetId, destId]);

  useEffect(() => {
    runtime.city = city;
    runtime.grid = new StaticGrid(city.boxes, city.circles, city.bounds);
    setClaimCity(city);
    vehicleRegistry.clear();
    vehicleRegistry.registerParked(city);
    live.x = city.spawn.x;
    live.z = city.spawn.z;
    live.yaw = city.spawn.yaw;
    return () => {
      if (runtime.city === city) {
        runtime.city = null;
        runtime.grid = null;
        setClaimCity(null);
        vehicleRegistry.clear();
      }
    };
  }, [city]);

  /** Stable canvas key — destination changes are spawn-only, never remount. */
  const canvasKey = "ommo-world";

  return { city, cityId, q, canvasKey, worldV1: true };
}
