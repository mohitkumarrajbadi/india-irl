import { damp } from "@/lib/math";
import { footAuthoritySync } from "@/game/sim/foot-authority";
import { live } from "@/game/runtime";
import { toast, useGame } from "@/game/store";
import type { CityData } from "@/world/types";
import type { PlayerState } from "./types.ts";

/** @returns true if locomotion should be skipped this frame. */
export function stepWasted(s: PlayerState, city: CityData, now: number, dt: number): boolean {
  if (s.wastedUntil <= 0) return false;
  s.speed = 0;
  s.ds.speed = 0;
  s.kb.x = 0;
  s.kb.z = 0;
  s.vy = 0;
  s.y = 0;
  if (now >= s.wastedUntil) {
    s.wastedUntil = 0;
    s.hp = 100;
    s.x = city.spawn.x;
    s.z = city.spawn.z;
    s.facing = city.spawn.yaw;
    s.camYaw = city.spawn.yaw;
    s.camPitch = 0.34;
    s.shake = 0;
    s.stunUntil = 0;
    s.mode = "foot";
    s.kind = 0;
    s.rideWith = null;
    s.emote = 0;
    footAuthoritySync({ x: s.x, y: 0, z: s.z, yaw: s.facing });
    useGame.setState({ wasted: false });
    live.hp = 100;
    toast("Back on the street");
  } else {
    s.camPitch = damp(s.camPitch, 0.72, 1.8, dt);
    s.shake *= Math.exp(-3.5 * dt);
  }
  return true;
}
