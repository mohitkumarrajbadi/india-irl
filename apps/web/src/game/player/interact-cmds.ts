/** Hangout sit / stand (E). Jobs removed — freeroam only. */
import { isSocialV2Enabled } from "@/game/sim/flags";
import { hangoutLeave, hangoutSeated, hangoutTrySit, SIT_EMOTE } from "@/game/social/hangout";
import { grantMission, toast } from "@/game/store";
import type { CityData } from "@/world/types";
import type { PlayerCmds, PlayerState } from "./types.ts";

export function interactAction(s: PlayerState, city: CityData, _cmds: PlayerCmds): void {
  if (!isSocialV2Enabled() || s.mode !== "foot" || s.wastedUntil > 0) return;
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
