/** One-shot key actions (non-hold). */
import { unlockAudio } from "@/game/audio";
import { cycleGaragePaint } from "@/game/cosmetics";
import { apartmentInviteNearest } from "@/game/social/apartment-invite";
import { convoyKeyAction } from "@/game/social/convoy-action";
import { toast, useGame } from "@/game/store";
import { cycleWeather } from "@/game/weather";
import { cycleTimePreset } from "@/gfx/env";
import { voice } from "@/net/voice";
import type { PlayerCmds, PlayerState } from "./types.ts";

export function dispatchKeyAction(s: PlayerState, cmds: PlayerCmds, code: string): void {
  const wheel = useGame.getState().emoteWheel;
  switch (code) {
    case "KeyF":
      cmds.vehicle();
      break;
    case "KeyE":
      cmds.interact();
      break;
    case "Digit1":
    case "Digit2":
    case "Digit3":
    case "Digit4":
    case "Digit5":
    case "Digit6":
    case "Digit7":
    case "Digit8":
    case "Digit9": {
      if (!wheel) break;
      const n = Number(code.replace("Digit", ""));
      cmds.emote(n);
      break;
    }
    case "KeyR":
      cmds.strike(0);
      break;
    case "KeyG":
      cmds.strike(1);
      break;
    case "KeyH":
      cmds.honkNow();
      break;
    case "KeyQ":
      s.blinker = s.blinker === -1 ? 0 : -1;
      s.blinkerArmed = false;
      toast(s.blinker === -1 ? "Left indicator" : "Indicators off");
      break;
    case "KeyPeriod":
      s.blinker = s.blinker === 1 ? 0 : 1;
      s.blinkerArmed = false;
      toast(s.blinker === 1 ? "Right indicator" : "Indicators off");
      break;
    case "KeyT":
      toast(`Time: ${cycleTimePreset()}`);
      break;
    case "KeyJ":
      toast(`Weather: ${cycleWeather()}`);
      break;
    case "Tab":
      useGame.setState({ emoteWheel: true });
      break;
    case "KeyM": {
      unlockAudio();
      if (!voice.on) void voice.enable().then(() => toast(voice.error || "Voice on"));
      else {
        voice.setMuted(!voice.muted);
        toast(voice.muted ? "Mic muted" : "Mic live");
      }
      break;
    }
    case "KeyN":
      useGame.setState((st) => ({ mapOpen: !st.mapOpen }));
      break;
    case "KeyC":
      if (!apartmentInviteNearest()) convoyKeyAction(!!s.keys.shift);
      break;
    case "KeyP":
      toast(cycleGaragePaint());
      break;
    case "Enter":
      useGame.setState({ chatOpen: true });
      break;
    case "KeyZ":
      cmds.emote(1);
      break;
    case "KeyX":
      cmds.emote(2);
      break;
    case "KeyV":
      cmds.emote(4);
      break;
    case "KeyB":
      cmds.emote(7);
      break;
    case "KeyY":
      cmds.emote(8);
      break;
    case "KeyU":
      cmds.emote(9);
      break;
    case "Escape":
      if (useGame.getState().mapOpen) useGame.setState({ mapOpen: false });
      break;
    default:
      break;
  }
}
