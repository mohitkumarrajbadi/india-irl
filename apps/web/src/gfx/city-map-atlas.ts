/**
 * Paint the static city once (roads, districts, metro, landmarks, meets).
 * Cached per city id + seed.
 */
import type { CityData } from "../world/types";
import type { CityMapAtlas } from "./city-map-types";
import { paintBlocks, paintLakeMetroLandmarks, paintRoads } from "./city-map-paint";

const cache = new Map<string, CityMapAtlas>();

/** Cap atlas edge so huge cities stay GPU-friendly. */
const MAX_EDGE = 2048;

export function clearCityMapCache(): void {
  cache.clear();
}

export function getCityMapAtlas(city: CityData): CityMapAtlas {
  const key = `${city.config.id}:${city.config.seed}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { bounds } = city;
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxZ - bounds.minZ;
  const pad = Math.max(80, Math.min(220, Math.round(Math.max(worldW, worldH) * 0.04)));
  const rawW = worldW + pad * 2;
  const rawH = worldH + pad * 2;
  const scale = Math.min(1, MAX_EDGE / Math.max(rawW, rawH));
  const w = Math.max(64, Math.ceil(rawW * scale));
  const h = Math.max(64, Math.ceil(rawH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const mx = (x: number) => (bounds.maxX - x + pad) * scale;
  const mz = (z: number) => (bounds.maxZ - z + pad) * scale;
  const sx = (m: number) => m * scale;

  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  g.addColorStop(0, "#243028");
  g.addColorStop(1, "#151c14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  paintRoads(ctx, city, bounds, worldW, worldH, mx, mz, sx, scale);
  paintBlocks(ctx, city, mx, mz, sx, scale);
  paintLakeMetroLandmarks(ctx, city, mx, mz, sx, scale);

  for (const m of city.meets) {
    const px = mx(m.x);
    const pz = mz(m.z);
    const r = Math.max(4, 5.5 * scale);
    ctx.fillStyle = "#46d6c4";
    ctx.beginPath();
    ctx.moveTo(px, pz - r);
    ctx.lineTo(px + r * 0.85, pz);
    ctx.lineTo(px, pz + r);
    ctx.lineTo(px - r * 0.85, pz);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(10,20,18,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = "#f3efe4";
  ctx.beginPath();
  ctx.arc(mx(city.spawn.x), mz(city.spawn.z), Math.max(3, 4 * scale), 0, Math.PI * 2);
  ctx.fill();

  const atlas: CityMapAtlas = { canvas, mx, mz, ppm: scale, width: w, height: h, worldW, worldH };
  cache.set(key, atlas);
  return atlas;
}
