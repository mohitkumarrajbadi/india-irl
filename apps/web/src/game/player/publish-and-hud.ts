/** Net publish, social mission, 4 Hz HUD. */
import type { ActorFrame } from "@/avatar/actor";
import { live } from "@/game/runtime";
import { grantMission, reportHudFps, useGame, type Hud } from "@/game/store";
import { env } from "@/gfx/env";
import { sendIntervalSec } from "@/net/interest";
import { sendState, useNet, type Peer } from "@/net/store";
import type { VehicleKind } from "@/vehicles/specs";
import { districtNameAt } from "@/world/generate";
import type { CityData } from "@/world/types";
import { DIRS } from "./constants.ts";
import { contextualPrompt } from "./prompt-ctx.ts";
import type { PlayerState } from "./types.ts";

export function publishLive(
  s: PlayerState,
  frame: ActorFrame,
  heading: number,
  forward: number,
  peerCount: number,
  dt: number,
): void {
  live.x = s.x;
  live.z = s.z;
  live.y = s.y;
  live.yaw = heading;
  live.speed = s.mode === "drive" ? s.ds.speed : s.actual;
  live.vehicle = (s.mode === "foot" ? 0 : s.kind) as VehicleKind;
  live.seat = s.seat;
  live.rideWith = s.mode === "passenger" ? s.rideWith : null;
  live.emote = s.emote;
  live.throttle = forward;
  live.hp = s.hp;
  live.blinker = frame.blinker ?? 0;

  s.send += dt;
  const snapshot = `${live.x.toFixed(1)}|${live.z.toFixed(1)}|${live.yaw.toFixed(2)}|${live.vehicle}|${live.emote}|${live.seat}|${live.rideWith}`;
  const changed = snapshot !== s.lastSent;
  const interval = sendIntervalSec({
    changed,
    speed: live.speed,
    vehicle: live.vehicle,
    emote: live.emote,
    peerCount,
  });
  if (s.send > interval) {
    s.send = 0;
    s.lastSent = snapshot;
    sendState();
  }
}

export function tickSocialAndJobs(s: PlayerState, peerMap: Map<string, Peer>): void {
  if (s.hangDone || peerMap.size === 0) return;
  let near = false;
  peerMap.forEach((p) => {
    if ((p.rx - s.x) ** 2 + (p.rz - s.z) ** 2 < 144) near = true;
  });
  if (near) {
    s.hangDone = true;
    grantMission("hang");
  }
}

export function syncHud(s: PlayerState, city: CityData, peerMap: Map<string, Peer>, dt: number): void {
  s.frames += 1;
  s.sample += dt;
  if (s.sample < 0.25) return;
  const fps = Math.round(s.frames / s.sample);
  const deg = ((((-s.camYaw * 180) / Math.PI) % 360) + 360) % 360;
  const hud: Hud = {
    fps,
    x: s.x,
    z: s.z,
    kmh: Math.round(Math.abs(live.speed) * 3.6),
    heading: `${DIRS[Math.round(deg / 45) % 8]} ${Math.round(deg)}°`,
    district: districtNameAt(city, s.x, s.z),
    mode: s.mode,
    vehicle: s.mode === "foot" ? 0 : s.kind,
    prompt: contextualPrompt(s, city, peerMap),
    hour: env.hour,
    hp: Math.round(s.hp),
  };
  useGame.setState({ hud });
  reportHudFps(fps);
  s.sample = 0;
  s.frames = 0;
}
