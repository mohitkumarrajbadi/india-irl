"use client";

import { useEffect, useMemo, useRef } from "react";
import { getCityMapAtlas, paintMapMarkers } from "@/gfx/city-map";
import { CITIES } from "@/world/cities";
import { generateCity } from "@/world/generate";
import type { CityId } from "@/world/types";

const genCache = new Map<CityId, ReturnType<typeof generateCity>>();

function cityData(id: CityId) {
  let c = genCache.get(id);
  if (!c) {
    c = generateCity(CITIES[id]);
    genCache.set(id, c);
  }
  return c;
}

/** Compact layout preview on the menu when picking a city / meet. */
export function CityMapThumb({
  cityId,
  meetId,
}: {
  cityId: CityId;
  meetId: string | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const city = useMemo(() => cityData(cityId), [cityId]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const atlas = getCityMapAtlas(city);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = 112;
    const cssH = Math.max(72, Math.round((atlas.height / atlas.width) * cssW));
    el.style.width = `${cssW}px`;
    el.style.height = `${cssH}px`;
    el.width = cssW * dpr;
    el.height = cssH * dpr;
    const ctx = el.getContext("2d") as CanvasRenderingContext2D;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#121812";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.drawImage(atlas.canvas, 0, 0, cssW, cssH);
    const sx = cssW / atlas.width;
    const sy = cssH / atlas.height;
    paintMapMarkers(
      ctx,
      atlas,
      city,
      {
        player: { x: city.spawn.x, z: city.spawn.z, yaw: city.spawn.yaw },
        meetId,
        labels: false,
      },
      (wx, wz) => ({ x: atlas.mx(wx) * sx, y: atlas.mz(wz) * sy }),
      1,
    );
  }, [city, meetId]);

  return (
    <div className="city-map-thumb">
      <div className="city-map-thumb-head">
        <span>Layout preview</span>
        <strong>{city.config.name}</strong>
      </div>
      <canvas ref={canvas} aria-label={`${city.config.name} street layout`} />
      <p className="city-map-thumb-note">
        ◆ meets · ● landmarks{meetId ? " · ring = spawn" : ""}
      </p>
    </div>
  );
}
