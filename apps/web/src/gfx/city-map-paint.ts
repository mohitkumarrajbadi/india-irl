/** Static atlas paint helpers (roads, blocks, lake/metro/landmarks). */
import type { CityData } from "../world/types";
import { KIND_COLOR } from "./city-map-types";

type MapFn = (n: number) => number;

export function paintRoads(
  ctx: CanvasRenderingContext2D,
  city: CityData,
  bounds: CityData["bounds"],
  worldW: number,
  worldH: number,
  mx: MapFn,
  mz: MapFn,
  sx: MapFn,
  scale: number,
): void {
  ctx.fillStyle = "#2c342e";
  for (const r of city.roadsX) {
    ctx.fillRect(mx(r.c + r.half + 2), mz(bounds.maxZ), sx(r.half * 2 + 4), sx(worldH));
  }
  for (const r of city.roadsZ) {
    ctx.fillRect(mx(bounds.maxX), mz(r.c + r.half + 2), sx(worldW), sx(r.half * 2 + 4));
  }
  ctx.fillStyle = "#3a433c";
  for (const r of city.roadsX) {
    ctx.fillRect(mx(r.c + r.half), mz(bounds.maxZ), sx(r.half * 2), sx(worldH));
  }
  for (const r of city.roadsZ) {
    ctx.fillRect(mx(bounds.maxX), mz(r.c + r.half), sx(worldW), sx(r.half * 2));
  }
  ctx.strokeStyle = "#d4b45a";
  ctx.lineWidth = Math.max(1.2, 1.6 * scale);
  ctx.setLineDash([6 * scale, 5 * scale]);
  for (const r of city.roadsX) {
    if (!r.arterial) continue;
    ctx.beginPath();
    ctx.moveTo(mx(r.c), mz(bounds.maxZ));
    ctx.lineTo(mx(r.c), mz(bounds.minZ));
    ctx.stroke();
  }
  for (const r of city.roadsZ) {
    if (!r.arterial) continue;
    ctx.beginPath();
    ctx.moveTo(mx(bounds.maxX), mz(r.c));
    ctx.lineTo(mx(bounds.minX), mz(r.c));
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function paintBlocks(
  ctx: CanvasRenderingContext2D,
  city: CityData,
  mx: MapFn,
  mz: MapFn,
  sx: MapFn,
  scale: number,
): void {
  for (const b of city.blocks) {
    const x = mx(b.maxX);
    const y = mz(b.maxZ);
    const bw = sx(b.maxX - b.minX);
    const bh = sx(b.maxZ - b.minZ);
    ctx.fillStyle = KIND_COLOR[b.kind] ?? "#555";
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = Math.max(0.5, scale);
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, bw - 1), Math.max(0, bh - 1));
  }
}

export function paintLakeMetroLandmarks(
  ctx: CanvasRenderingContext2D,
  city: CityData,
  mx: MapFn,
  mz: MapFn,
  sx: MapFn,
  scale: number,
): void {
  if (city.lake) {
    const L = city.lake;
    ctx.fillStyle = "rgba(40, 130, 170, 0.55)";
    ctx.beginPath();
    ctx.ellipse(
      mx((L.minX + L.maxX) / 2),
      mz((L.minZ + L.maxZ) / 2),
      sx((L.maxX - L.minX) / 2),
      sx((L.maxZ - L.minZ) / 2),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 220, 240, 0.35)";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.stroke();
  }

  const l = city.metroLine;
  ctx.strokeStyle = city.config.metro.color;
  ctx.lineWidth = Math.max(2.5, 3.5 * scale);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(mx(l.x0), mz(l.z0));
  ctx.lineTo(mx(l.x1), mz(l.z1));
  ctx.stroke();
  ctx.fillStyle = "#f4f0e6";
  for (const s of city.metroSegments) {
    const sx0 = mx((s.x0 + s.x1) / 2);
    const sy0 = mz((s.z0 + s.z1) / 2);
    const r = Math.max(3, 4.5 * scale);
    ctx.fillRect(sx0 - r, sy0 - r, r * 2, r * 2);
  }

  for (const lm of city.landmarks) {
    const px = mx(lm.x);
    const pz = mz(lm.z);
    const r = Math.max(5, 7 * scale);
    ctx.fillStyle = "#e7c56a";
    ctx.beginPath();
    ctx.arc(px, pz, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,20,16,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

}
