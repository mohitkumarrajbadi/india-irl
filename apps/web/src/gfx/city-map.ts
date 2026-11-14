/**
 * Shared 2D city map painter for the HUD minimap, fullscreen preview, and menu.
 * World +Z = north, −X = east on the canvas.
 */
import type { CityData } from "../world/types";

export const KIND_COLOR: Record<string, string> = {
  tech: "#3d5266",
  cbd: "#355a72",
  resi: "#4f564c",
  market: "#735440",
  old: "#634c3c",
  park: "#3a6b38",
  landmark: "#7e6e48",
  lake: "#2a6a88",
};

export type MapJob = {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  stage: string;
};

export type MapMarkers = {
  player?: { x: number; z: number; yaw: number };
  peers?: { x: number; z: number; veh: boolean }[];
  job?: MapJob | null;
  /** Highlight a meet id (menu spawn / deep-link). */
  meetId?: string | null;
  labels?: boolean;
};

export type CityMapAtlas = {
  canvas: HTMLCanvasElement;
  /** World → atlas pixel. */
  mx: (x: number) => number;
  mz: (z: number) => number;
  /** Atlas pixels per world metre. */
  ppm: number;
  width: number;
  height: number;
  worldW: number;
  worldH: number;
};

const cache = new Map<string, CityMapAtlas>();

/** Cap atlas edge so huge cities stay GPU-friendly. */
const MAX_EDGE = 2048;

export function clearCityMapCache(): void {
  cache.clear();
}

/**
 * Paint the static city once (roads, districts, metro, landmarks, meets).
 * Cached per city id + seed.
 */
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

  // Soft ground wash
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  g.addColorStop(0, "#243028");
  g.addColorStop(1, "#151c14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Roads (shoulder then asphalt)
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
  // Arterial centerline
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

  // District blocks
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

  // Lake overlay (stronger than block tint)
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

  // Metro
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

  // Landmarks
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

  // Meet plazas
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

  // Spawn
  const sp = city.spawn;
  ctx.fillStyle = "#f3efe4";
  ctx.beginPath();
  ctx.arc(mx(sp.x), mz(sp.z), Math.max(3, 4 * scale), 0, Math.PI * 2);
  ctx.fill();

  const atlas: CityMapAtlas = { canvas, mx, mz, ppm: scale, width: w, height: h, worldW, worldH };
  cache.set(key, atlas);
  return atlas;
}

/** Draw live markers on top of a windowed or full atlas view. */
export function paintMapMarkers(
  ctx: CanvasRenderingContext2D,
  atlas: CityMapAtlas,
  city: CityData,
  markers: MapMarkers,
  toScreen: (wx: number, wz: number) => { x: number; y: number },
  dpr = 1,
): void {
  const { job, peers, player, meetId, labels } = markers;

  if (job && job.stage !== "idle") {
    const a = toScreen(job.fromX, job.fromZ);
    const b = toScreen(job.toX, job.toZ);
    ctx.strokeStyle = "rgba(231, 197, 106, 0.85)";
    ctx.lineWidth = 2 * dpr;
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    pin(ctx, a.x, a.y, "#46d6c4", dpr);
    pin(ctx, b.x, b.y, "#e0623a", dpr);
  }

  peers?.forEach((p) => {
    const s = toScreen(p.x, p.z);
    ctx.fillStyle = p.veh ? "#7ff0df" : "#f08a5d";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.2 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

  if (meetId) {
    const m = city.meets.find((x) => x.spec.id === meetId);
    if (m) {
      const s = toScreen(m.x, m.z);
      ctx.strokeStyle = "#e7c56a";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (labels) {
    ctx.font = `${11 * dpr}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const lm of city.landmarks) {
      const s = toScreen(lm.x, lm.z);
      label(ctx, lm.spec.label, s.x, s.y - 10 * dpr, dpr);
    }
    for (const m of city.meets) {
      const s = toScreen(m.x, m.z);
      label(ctx, m.spec.label, s.x, s.y - 9 * dpr, dpr);
    }
  }

  if (player) {
    const s = toScreen(player.x, player.z);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, -7 * dpr);
    ctx.lineTo(5 * dpr, 6 * dpr);
    ctx.lineTo(0, 3 * dpr);
    ctx.lineTo(-5 * dpr, 6 * dpr);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function pin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, dpr: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4.5 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, dpr: number): void {
  const t = text.length > 18 ? `${text.slice(0, 16)}…` : text;
  ctx.fillStyle = "rgba(10, 14, 10, 0.72)";
  const w = ctx.measureText(t).width;
  ctx.fillRect(x - w / 2 - 4 * dpr, y - 12 * dpr, w + 8 * dpr, 14 * dpr);
  ctx.fillStyle = "#f3efe4";
  ctx.fillText(t, x, y);
}
