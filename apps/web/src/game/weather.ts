/**
 * City weather: clear → haze → drizzle → rain → storm.
 * Wetness lags precipitation so roads stay slick after showers.
 */
export type WeatherId = "clear" | "haze" | "drizzle" | "rain" | "storm";

export type WeatherState = {
  id: WeatherId;
  /** Instant precipitation 0…1. */
  rain: number;
  /** Road wetness 0…1 (lags rain). */
  wet: number;
  /** Extra fog 0…1. */
  fog: number;
  /** Cloud cover 0…1 (dims sun). */
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

export const weather: WeatherState = {
  id: "clear",
  rain: 0,
  wet: 0,
  fog: 0,
  cloud: 0.05,
};

let autoAcc = 0;
/** Pause auto shifts after a manual cycle (ms timestamp). */
let autoHoldUntil = 0;

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
  if (autoAcc < 45 + Math.random() * 40) return;
  autoAcc = 0;
  // Monsoon-ish cities: more afternoon showers
  const monsoon = cityId === "novapura" || cityId === "mandipura" || cityId === "neerabad";
  const aft = hour >= 14 && hour <= 19;
  if (weather.id === "clear" && monsoon && aft && Math.random() < 0.45) {
    setWeather(Math.random() < 0.55 ? "drizzle" : "haze");
  } else if (weather.id === "drizzle" && Math.random() < 0.4) {
    setWeather(Math.random() < 0.5 ? "rain" : "clear");
  } else if (weather.id === "rain" && Math.random() < 0.5) {
    setWeather(Math.random() < 0.25 ? "storm" : "drizzle");
  } else if (weather.id === "storm" && Math.random() < 0.6) {
    setWeather("rain");
  } else if (weather.id === "haze" && Math.random() < 0.5) {
    setWeather("clear");
  }
}
