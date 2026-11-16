/** Hangout sit / stand + apartment enter / leave (E). */
import {
  apartmentAcceptInvite,
  apartmentInside,
  apartmentLeave,
  apartmentPending,
  apartmentTryEnter,
} from "@/game/apartment";
import { isSocialV2Enabled } from "@/game/sim/flags";
import { hangoutLeave, hangoutSeated, hangoutTrySit, SIT_EMOTE } from "@/game/social/hangout";
import { grantMission, toast } from "@/game/store";
import type { CityData } from "@/world/types";
import type { PlayerCmds, PlayerState } from "./types.ts";

export function interactAction(s: PlayerState, city: CityData, _cmds: PlayerCmds): void {
  if (s.mode !== "foot" || s.wastedUntil > 0) return;

  if (apartmentInside()) {
    const prev = apartmentLeave();
    if (prev) {
      s.x = prev.doorX;
      s.z = prev.doorZ;
      s.facing = prev.doorYaw;
      s.y = 0;
      toast("Left the flat");
    }
    return;
  }

  if (apartmentPending()) {
    const a = apartmentAcceptInvite(city);
    if (a) {
      s.x = a.x;
      s.z = a.z;
      s.facing = a.yaw;
      s.speed = 0;
      s.y = 0.05;
      toast(`Visiting · ${a.label}`);
      grantMission("home");
      return;
    }
  }

  const apt = apartmentTryEnter(city, s.x, s.z, s.facing);
  if (apt) {
    s.x = apt.x;
    s.z = apt.z;
    s.facing = apt.yaw;
    s.speed = 0;
    s.y = 0.05;
    toast(`Home · ${apt.label}`);
    grantMission("home");
    return;
  }

  if (!isSocialV2Enabled()) return;
  if (hangoutSeated()) {
    hangoutLeave();
    s.emote = 0;
    toast("Stood up");
    return;
  }
  const a = hangoutTrySit(city, s.x, s.z);
  if (!a) return;
  s.x = a.x;
  s.z = a.z;
  s.facing = a.yaw;
  s.speed = 0;
  s.emote = SIT_EMOTE;
  s.emoteStart = performance.now();
  toast(`Sitting · ${a.label}`);
  grantMission("emote");
}
