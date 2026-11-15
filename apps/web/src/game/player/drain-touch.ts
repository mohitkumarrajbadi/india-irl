import { touchInput } from "@/game/input";
import type { PlayerCmds } from "./types.ts";

export function drainTouchPulses(cmds: PlayerCmds): void {
  const pulses = touchInput.pulses;
  if (pulses.length === 0) return;
  touchInput.pulses = [];
  for (const code of pulses) {
    if (code === "KeyF") cmds.vehicle();
    else if (code === "KeyE") cmds.interact();
    else if (code === "KeyH") cmds.honkNow();
    else if (code === "KeyZ") cmds.emote(1);
    else if (code === "KeyX") cmds.emote(2);
    else if (code === "KeyC") cmds.emote(3);
    else if (code === "KeyV") cmds.emote(4);
    else if (code === "KeyB") cmds.emote(7);
    else if (code === "KeyY") cmds.emote(8);
    else if (code === "KeyU") cmds.emote(9);
    else if (code === "KeyR") cmds.strike(0);
    else if (code === "KeyG") cmds.strike(1);
  }
}
