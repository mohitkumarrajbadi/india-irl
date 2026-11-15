/** Wire PlayerCmds bag used by keyboard, touch, and frame. */
import { runtime } from "@/game/runtime";
import type { CityData } from "@/world/types";
import { applyCrashHit, ejectCrash, triggerWasted } from "./crash-cmds.ts";
import { emoteAction, honkNow, strikeAction } from "./combat-cmds.ts";
import { interactAction } from "./interact-cmds.ts";
import type { PlayerCmds, PlayerState } from "./types.ts";
import { vehicleAction } from "./vehicle-cmds.ts";

export function bindPlayerCmds(s: PlayerState, city: CityData): PlayerCmds {
  const grid = () => runtime.grid;
  const cmds: PlayerCmds = {
    interact: () => {},
    vehicle: () => {},
    honkNow: () => {},
    emote: () => {},
    strike: () => {},
    ejectCrash: () => {},
    triggerWasted: () => {},
    applyCrashHit: () => false,
  };
  cmds.ejectCrash = (sev, nx, nz) => ejectCrash(s, grid(), sev, nx, nz);
  cmds.triggerWasted = () => triggerWasted(s);
  cmds.applyCrashHit = (sev, nx, nz, speed, opts) =>
    applyCrashHit(s, grid(), sev, nx, nz, speed, opts);
  cmds.vehicle = () => vehicleAction(s, grid(), city);
  cmds.interact = () => interactAction(s, city, cmds);
  cmds.honkNow = () => honkNow(s);
  cmds.emote = (id) => emoteAction(s, cmds, id);
  cmds.strike = (k) => strikeAction(s, k);
  return cmds;
}
