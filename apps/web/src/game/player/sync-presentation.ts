/** Actor frame, headlights, audio bed. */
import type { Actor, ActorFrame } from "@/avatar/actor";
import { footstep, setAmbient, setEngine, setRainAmbience, tickDistantTraffic } from "@/game/audio";
import { weather } from "@/game/weather";
import { headlightPower, rainAudioMul } from "@/gfx/atmosphere-fx";
import { env } from "@/gfx/env";
import { selfSay } from "@/game/runtime";
import { districtNameAt } from "@/world/generate";
import type { CityData } from "@/world/types";
import type * as THREE from "three";
import { PLAYER_PHYSICS } from "@/vehicles/physics-props";
import { ambientKindHint } from "./ambient-hint.ts";
import type { PlayerState } from "./types.ts";

export function syncActorFrame(
  s: PlayerState,
  frame: ActorFrame,
  actor: Actor,
  heading: number,
  now: number,
  dt: number,
  camX: number,
  camZ: number,
): void {
  frame.emote = s.emote;
  frame.emoteT = (now - s.emoteStart) / 1000;
  frame.vehicle = s.mode === "foot" ? 0 : s.kind;
  frame.seat = s.seat;
  frame.passenger = s.mode === "passenger";
  frame.x = s.x;
  frame.z = s.z;
  frame.yaw = heading;
  frame.speed = s.mode === "drive" ? s.ds.speed : s.actual;
  frame.roll = s.mode === "drive" ? s.ds.roll : 0;
  frame.y = s.y;
  if (s.mode === "drive" && (s.kind === 1 || s.kind === 2 || s.kind === 3)) {
    frame.chassisHealth = s.chassisHp / Math.max(1, PLAYER_PHYSICS[s.kind].durability);
  } else {
    frame.chassisHealth = 1;
  }
  frame.blinker =
    s.mode !== "drive"
      ? 0
      : s.blinker !== 0
        ? s.blinker
        : Math.abs(s.ds.steer) > 0.55
          ? s.ds.steer > 0
            ? -1
            : 1
          : 0;
  actor.update(frame, dt, now, camX, camZ);
  if (selfSay.seq !== s.sayHeard) {
    s.sayHeard = selfSay.seq;
    actor.say(selfSay.text, selfSay.until);
  }
}

export function syncHeadlights(s: PlayerState, lights: THREE.Group | null): void {
  if (!lights) return;
  const on = s.mode === "drive";
  lights.visible = on;
  if (!on) return;
  lights.position.set(s.ds.x, 0.8, s.ds.z);
  lights.rotation.y = s.ds.yaw;
  const power = headlightPower(env.night, weather.rain, weather.fog, weather.wet);
  for (const c of lights.children) {
    if ((c as THREE.SpotLight).isSpotLight) (c as THREE.SpotLight).intensity = power;
  }
}

export function tickPlayerAudio(s: PlayerState, city: CityData, dt: number): void {
  if (s.mode === "foot") {
    setEngine(0, 0);
    footstep(s.actual, dt);
  } else if (s.mode === "drive") setEngine(s.kind, s.ds.speed);
  else setEngine(0, 0);
  const hint = ambientKindHint(districtNameAt(city, s.x, s.z), env.night);
  if (hint !== s.ambient) {
    s.ambient = hint;
    setAmbient(hint, 1);
  }
  tickDistantTraffic(env.night, dt);
  setRainAmbience(rainAudioMul(weather.rain, weather.wet));
}
