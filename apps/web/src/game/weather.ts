/**
 * City weather: clear → haze → drizzle → rain → storm.
 * Wetness lags precipitation so roads stay slick after showers.
 * Auto shifts are city+hour seeded so peers stay in sync.
 */
import { hashString, mulberry32 } from "../lib/rng.ts";

export type WeatherId = "clear" | "haze" | "drizzle" | "rain" | "storm";

export type WeatherState = {
  id: WeatherId;
  /** Instant precipitation 0…1. */
  rain: number;
  /** Road wetness 0…1 (lags rain). */
  wet: number;
  /** Extra fog 0…1. */
  fog: number;
  /** Cloud cover 0…1 (dims sun + sky). */
  cloud: number;
};

const ORDER: WeatherId[] = ["clear", "haze", "drizzle", "rain", "storm"];

const TARGETS: Record<WeatherId, { rain: number; fog: number; cloud: number }> = {
  clear: { rain: 0, fog: 0, cloud: 0.05 },
  haze: { rain: 0, fog: 0.35, cloud: 0.35 },
  drizzle: { rain: 0.28, fog: 0.25, cloud: 0.55 },
  rain: { rain: 0.7, fog: 0.45, cloud: 0.75 },
  storm: { rain: 1, fog: 0.7, cloud: 0.92 },
};

/** Monsoon-prone metros — afternoon showers + morning haze. */
const MONSOON = new Set(["novapura", "mandipura", "neerabad"]);

export const weather: WeatherState = {
  id: "clear",
  rain: 0,
  wet: 0,
  fog: 0,
  cloud: 0.05,
};

let autoAcc = 0;
/** Fixed wait until next auto attempt (seconds) — set once, not re-rolled every frame. */
let autoNext = 55;
/** Pause auto shifts after a manual cycle (ms timestamp). */
let autoHoldUntil = 0;
/** Deterministic step counter for seeded rolls. */
let autoStep = 0;

export function setWeather(id: WeatherId): WeatherId {
  weather.id = id;
  return id;
}

export function cycleWeather(): string {
  const i = ORDER.indexOf(weather.id);
  const next = ORDER[(i + 1) % ORDER.length]!;
  setWeather(next);
  autoHoldUntil = performance.now() + 180_000;
  return weatherLabel(next);
}

export function weatherLabel(id: WeatherId = weather.id): string {
  return id[0]!.toUpperCase() + id.slice(1);
}

/** Tyre grip multiplier from wet roads (rain cuts traction). */
export function wetGripMul(): number {
  return 1 - weather.wet * 0.38;
}

/** Brake/coast drag bump when wet. */
export function wetDragMul(): number {
  return 1 + weather.wet * 0.35;
}

/** Reset auto-cycle timers (tests). */
export function resetWeatherAuto(): void {
  autoAcc = 0;
  autoNext = 55;
  autoHoldUntil = 0;
  autoStep = 0;
}

function roll(cityId: string, hour: number, step: number): number {
  const seed = hashString(`${cityId}|${Math.floor(hour)}|${step}|wx`);
  return mulberry32(seed)();
}

function scheduleNext(cityId: string, hour: number, step: number): void {
  // 40–80 s between attempts; monsoon afternoons check a bit sooner
  const monsoon = MONSOON.has(cityId);
  const aft = hour >= 14 && hour <= 19;
  const base = monsoon && aft ? 38 : 48;
  autoNext = base + roll(cityId, hour, step) * 32;
}

/** Pick next id from India-ish diurnal pattern. */
function pickAutoShift(cityId: string, hour: number, step: number): WeatherId | null {
  const r = roll(cityId, hour, step + 17);
  const r2 = roll(cityId, hour, step + 31);
  const monsoon = MONSOON.has(cityId);
  const morning = hour >= 6 && hour < 11;
  const afternoon = hour >= 14 && hour <= 19;
  const evening = hour >= 19 && hour < 23;
  const night = hour >= 23 || hour < 6;

  switch (weather.id) {
    case "clear":
      if (morning && r < (monsoon ? 0.55 : 0.35)) return "haze";
      if (afternoon && monsoon && r < 0.62) return r2 < 0.55 ? "drizzle" : "haze";
      if (afternoon && !monsoon && r < 0.28) return "haze";
      if (evening && monsoon && r < 0.35) return "drizzle";
      if (night && r < 0.18) return "haze";
      return null;
    case "haze":
      if (afternoon && monsoon && r < 0.5) return r2 < 0.45 ? "drizzle" : "clear";
      if (r < 0.55) return "clear";
      return null;
    case "drizzle":
      if (afternoon && monsoon && r < 0.48) return r2 < 0.35 ? "rain" : "drizzle";
      if (r < 0.4) return "rain";
      if (r < 0.75) return "clear";
      return "haze";
    case "rain":
      if (monsoon && afternoon && r < 0.35) return "storm";
      if (r < 0.45) return "drizzle";
      if (r < 0.7) return "storm";
      return "haze";
    case "storm":
      if (r < 0.65) return "rain";
      return "drizzle";
    default:
      return null;
  }
}

/** Advance weather toward targets; optional light auto cycle by city/hour. */
export function tickWeather(dt: number, hour: number, cityId: string, auto = true): void {
  const t = TARGETS[weather.id];
  const k = 1 - Math.exp(-1.8 * dt);
  weather.rain += (t.rain - weather.rain) * k;
  weather.fog += (t.fog - weather.fog) * k;
  weather.cloud += (t.cloud - weather.cloud) * k;
  // Wetness rises with rain, drains slowly when dry
  if (weather.rain > weather.wet) weather.wet += (weather.rain - weather.wet) * Math.min(1, 1.1 * dt);
  else weather.wet += (weather.rain - weather.wet) * Math.min(1, 0.12 * dt);

  if (!auto || performance.now() < autoHoldUntil) return;
  autoAcc += dt;
  if (autoAcc < autoNext) return;
  autoAcc = 0;
  autoStep += 1;
  const next = pickAutoShift(cityId, hour, autoStep);
  scheduleNext(cityId, hour, autoStep);
  if (next) setWeather(next);
}
