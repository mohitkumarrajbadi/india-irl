import * as THREE from "three";
import { clamp, lerp, smoothstep } from "../lib/math";

/**
 * Time of day for the whole world. Default is the real clock in India, so a
 * friend in Pune and a friend in Bengaluru always see the same sky.
 */
export const clock = {
  /** -1 follows the real IST clock, otherwise a fixed preset hour that drifts slowly. */
  preset: -1,
  presetStart: 0,
};

export const TIME_PRESETS: { label: string; hour: number }[] = [
  { label: "Live IST", hour: -1 },
  { label: "Sunrise", hour: 6.2 },
  { label: "Morning", hour: 9 },
  { label: "Noon", hour: 13 },
  { label: "Golden hour", hour: 17.6 },
  { label: "Night", hour: 22 },
];

export function cycleTimePreset(): string {
  const idx = TIME_PRESETS.findIndex((p) => p.hour === clock.preset);
  const next = TIME_PRESETS[(idx + 1) % TIME_PRESETS.length];
  clock.preset = next.hour;
  clock.presetStart = performance.now();
  return next.label;
}

export function gameHour(): number {
  if (clock.preset < 0) {
    const ist = Date.now() / 3_600_000 + 5.5;
    return ((ist % 24) + 24) % 24;
  }
  const drift = (performance.now() - clock.presetStart) / 1000 / 600;
  return (clock.preset + drift) % 24;
}

export function formatHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm.toString().padStart(2, "0")} ${ampm}`;
}

const C = (hex: string) => new THREE.Color(hex);
const NIGHT_ZENITH = C("#040816");
const DAY_ZENITH = C("#3f7fd0");
const NIGHT_HORIZON = C("#101a30");
const DAY_HORIZON = C("#b6d2ea");
const DUSK = C("#ff9456");
const SUN_LOW = C("#ff9d57");
const SUN_HIGH = C("#fff3de");
const MOON = C("#8aa8e0");
const GROUND_DAY = C("#8a7a55");
const GROUND_NIGHT = C("#161a22");
const HEMI_DAY = C("#cfe6ff");
const HEMI_NIGHT = C("#2b3a66");

export type EnvState = {
  hour: number;
  /** 0 full day, 1 full night. */
  night: number;
  twilight: number;
  sunDir: THREE.Vector3;
  lightDir: THREE.Vector3;
  lightColor: THREE.Color;
  lightIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  ambient: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  fog: THREE.Color;
  hills: THREE.Color;
};

export const env: EnvState = {
  hour: 12,
  night: 0,
  twilight: 0,
  sunDir: new THREE.Vector3(0, 1, 0),
  lightDir: new THREE.Vector3(0, 1, 0),
  lightColor: new THREE.Color(),
  lightIntensity: 1,
  hemiSky: new THREE.Color(),
  hemiGround: new THREE.Color(),
  hemiIntensity: 1,
  ambient: 0.1,
  zenith: new THREE.Color(),
  horizon: new THREE.Color(),
  fog: new THREE.Color(),
  hills: new THREE.Color(),
};

/** Shared uniform so every lit window and sign reacts to one write per frame. */
export const nightUniform = { value: 0 };

const tmp = new THREE.Color();

export function updateEnv(hour: number, haze: THREE.Color, hillColor: THREE.Color): EnvState {
  const a = ((hour - 6) / 12) * Math.PI;
  const sinA = Math.sin(a);
  const day = smoothstep(-0.08, 0.28, sinA);
  const night = 1 - day;
  // East is -X in this world, so the sun climbs from -X.
  env.sunDir.set(-Math.cos(a), sinA, 0.32).normalize();
  env.hour = hour;
  env.night = night;
  env.twilight = Math.exp(-Math.pow(sinA / 0.2, 2)) * (sinA > -0.35 ? 1 : 0);

  env.zenith.copy(NIGHT_ZENITH).lerp(DAY_ZENITH, day);
  env.horizon.copy(NIGHT_HORIZON).lerp(DAY_HORIZON, day).lerp(DUSK, env.twilight * 0.75);
  env.fog.copy(env.horizon).lerp(haze, 0.35 * day);
  tmp.copy(hillColor);
  env.hills.copy(env.fog).lerp(tmp, 0.45 * day + 0.12 * (1 - day));

  const sunUp = smoothstep(-0.02, 0.2, sinA);
  const moonUp = smoothstep(0.0, 0.25, -sinA);
  if (sunUp >= moonUp) {
    env.lightDir.copy(env.sunDir);
    env.lightColor.copy(SUN_LOW).lerp(SUN_HIGH, clamp(sinA * 1.8, 0, 1));
    env.lightIntensity = 2.6 * sunUp;
  } else {
    env.lightDir.set(env.sunDir.x * -1, -env.sunDir.y, -env.sunDir.z).normalize();
    env.lightColor.copy(MOON);
    env.lightIntensity = 0.55 * moonUp;
  }
  env.hemiSky.copy(HEMI_NIGHT).lerp(HEMI_DAY, day).lerp(DUSK, env.twilight * 0.25);
  env.hemiGround.copy(GROUND_NIGHT).lerp(GROUND_DAY, day);
  env.hemiIntensity = lerp(0.42, 0.95, day);
  env.ambient = lerp(0.1, 0.12, day);
  nightUniform.value = night;
  return env;
}
