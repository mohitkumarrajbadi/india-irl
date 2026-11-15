/** Honk, emote, punch/kick. */
import { EMOTES, isDanceEmote } from "@/avatar/rig";
import { emoteCue, honk, unlockAudio } from "@/game/audio";
import { COMBAT, inStrikeCone } from "@/game/physics";
import { runtime } from "@/game/runtime";
import { advanceStep, loadOnboard, markFirstEmote } from "@/game/onboarding";
import { grantMission, toast, useGame } from "@/game/store";
import { sendHit, sendHonk, useNet } from "@/net/store";
import { hitCue } from "@/game/audio";
import type { PlayerCmds, PlayerState } from "./types.ts";

export function honkNow(s: PlayerState): void {
  if (s.kind > 0) {
    unlockAudio();
    honk(s.kind);
    sendHonk();
    const now = performance.now();
    runtime.peds?.reactToHorn(s.x, s.z, now);
    runtime.animals?.reactToHorn(s.x, s.z, now);
  }
}

export function emoteAction(s: PlayerState, cmds: PlayerCmds, id: number): void {
  if (isDanceEmote(id) && s.mode !== "foot") return;
  if ((id === 5 || id === 6) && s.mode !== "foot") return;
  if (id === 5 || id === 6) {
    cmds.strike(id === 6 ? 1 : 0);
    return;
  }
  s.emote = s.emote === id ? 0 : id;
  s.emoteStart = performance.now();
  if (!s.emote) return;
  unlockAudio();
  emoteCue(s.emote);
  toast(EMOTES[s.emote]?.name ?? "Emote");
  grantMission("emote");
  const before = loadOnboard();
  if (!before.firstEmoteDone) {
    markFirstEmote();
    toast("Nice — wave at someone nearby (Z)");
    advanceStep("wave_prompt");
    useGame.setState({ onboardUi: before.intent ? null : "intent" });
  }
}

export function strikeAction(s: PlayerState, kind: 0 | 1): void {
  if (s.mode !== "foot" || s.wastedUntil > 0) return;
  const now = performance.now();
  if (now < s.stunUntil || now < s.fightCd) return;
  unlockAudio();
  const emoteId = kind === 1 ? COMBAT.hitEmoteKick : COMBAT.hitEmotePunch;
  s.emote = emoteId;
  s.emoteStart = now;
  s.fightCd = now + COMBAT.cooldown * 1000;
  emoteCue(emoteId);
  grantMission("emote");
  const range = kind === 1 ? COMBAT.kickRange : COMBAT.punchRange;
  const cone = kind === 1 ? COMBAT.kickCone : COMBAT.punchCone;
  const { peerMap: map } = useNet.getState();
  let hitId = "";
  let hitName = "";
  let bestD = range * range;
  for (const p of map.values()) {
    if (p.veh !== 0 || p.passenger) continue;
    if (!inStrikeCone(s.x, s.z, s.facing, p.rx, p.rz, range, cone)) continue;
    const d2 = (p.rx - s.x) ** 2 + (p.rz - s.z) ** 2;
    if (d2 < bestD) {
      bestD = d2;
      hitId = p.id;
      hitName = p.name;
    }
  }
  if (hitId) {
    sendHit(hitId, kind);
    hitCue(kind === 1 ? 1.2 : 1);
    toast(`${kind === 1 ? "Kick" : "Punch"} · ${hitName}`);
    const pedSim = runtime.peds;
    if (pedSim) {
      for (const ped of pedSim.peds) {
        if ((ped.x - s.x) ** 2 + (ped.z - s.z) ** 2 < 100) {
          pedSim.reactToHit(ped, s.x, s.z, now);
          break;
        }
      }
    }
    return;
  }
  const pedSim = runtime.peds;
  if (pedSim) {
    let bestPed = null as null | (typeof pedSim.peds)[number];
    let bestPedD = range * range;
    for (const ped of pedSim.peds) {
      if (!inStrikeCone(s.x, s.z, s.facing, ped.x, ped.z, range, cone)) continue;
      const d2 = (ped.x - s.x) ** 2 + (ped.z - s.z) ** 2;
      if (d2 < bestPedD) {
        bestPedD = d2;
        bestPed = ped;
      }
    }
    if (bestPed) {
      const reaction = pedSim.reactToHit(bestPed, s.x, s.z, now);
      hitCue(kind === 1 ? 1.1 : 0.9);
      toast(
        reaction === "fight"
          ? kind === 1
            ? "Kick — they swung back!"
            : "Punch — street fight!"
          : kind === 1
            ? "Kick — they bolted"
            : "Punch — crowd scatters",
      );
      return;
    }
  }
  toast(kind === 1 ? "Kick" : "Punch");
}
