/** Incoming hits, ped counters, traffic run-down, fight emote clear. */
import { crashCue, hitCue } from "@/game/audio";
import { reportCrash } from "@/game/crash";
import { resolveFootTrafficHit } from "@/game/foot-traffic-hit";
import { COMBAT } from "@/game/physics";
import { live, pendingHits, runtime } from "@/game/runtime";
import { toast } from "@/game/store";
import type { Peer } from "@/net/store";
import type { PlayerCmds, PlayerState } from "./types.ts";

export function stepCombatIncoming(
  s: PlayerState,
  cmds: PlayerCmds,
  peerMap: Map<string, Peer>,
  now: number,
  dt: number,
): void {
  if (pendingHits.length) {
    const hits = pendingHits.splice(0);
    for (const h of hits) {
      if (s.mode !== "foot") continue;
      const force = h.kind === 1 ? COMBAT.kickForce : COMBAT.punchForce;
      const dmg = h.kind === 1 ? COMBAT.kickDamage : COMBAT.punchDamage;
      const peer = peerMap.get(h.from);
      let nx = -Math.sin(s.facing);
      let nz = -Math.cos(s.facing);
      if (peer) {
        const dx = s.x - peer.rx;
        const dz = s.z - peer.rz;
        const d = Math.hypot(dx, dz) || 1;
        nx = dx / d;
        nz = dz / d;
      }
      s.kb.x += nx * force;
      s.kb.z += nz * force;
      s.vy = Math.max(s.vy, h.kind === 1 ? 2.8 : 1.6);
      s.stunUntil = now + COMBAT.stun * 1000;
      s.hp = Math.max(0, s.hp - dmg);
      hitCue(h.kind === 1 ? 1.2 : 1);
      s.shake = Math.min(1.2, s.shake + 0.35);
      toast(h.kind === 1 ? "Got kicked!" : "Got punched!");
      if (s.hp <= 0) cmds.triggerWasted();
    }
  }
  if (s.wastedUntil <= 0 && s.hp < 100 && now > s.stunUntil + 2500) s.hp = Math.min(100, s.hp + 8 * dt);
  live.hp = s.hp;

  if (s.mode === "foot" && s.wastedUntil <= 0 && now > s.stunUntil) {
    const pedSim = runtime.peds;
    if (pedSim?.tryCounter(s.x, s.z, now)) {
      s.kb.x -= Math.sin(s.facing) * COMBAT.punchForce * 0.85;
      s.kb.z -= Math.cos(s.facing) * COMBAT.punchForce * 0.85;
      s.vy = Math.max(s.vy, 1.4);
      s.stunUntil = now + COMBAT.stun * 900;
      s.hp = Math.max(0, s.hp - COMBAT.punchDamage * 0.7);
      hitCue(1);
      s.shake = Math.min(1.2, s.shake + 0.4);
      if (now - s.lastCrashToast > 1200) {
        s.lastCrashToast = now;
        toast("Crowd fought back!");
      }
      if (s.hp <= 0) cmds.triggerWasted();
    }
  }

  if (s.mode === "foot" && s.wastedUntil <= 0 && runtime.traffic && now > s.crashCd) {
    const hit = resolveFootTrafficHit(s.x, s.z, s.hp, runtime.traffic.agents);
    if (hit) {
      s.crashCd = now + 700;
      s.kb.x += hit.nx * hit.force;
      s.kb.z += hit.nz * hit.force;
      s.vy = Math.max(s.vy, hit.up);
      s.y = Math.max(s.y, 0.25);
      s.hp = Math.max(0, s.hp - hit.damage);
      s.stunUntil = now + 500 + hit.sev * 900;
      s.shake = Math.min(1.4, s.shake + 0.35 + hit.sev * 0.7);
      hitCue(1.3);
      crashCue(0.6 + hit.sev);
      reportCrash(s.x, s.z, hit.sev, false);
      if (now - s.lastCrashToast > 1200) {
        s.lastCrashToast = now;
        toast(hit.kill || s.hp <= 0 ? "Hit by traffic" : "Almost run over!");
      }
      if (hit.kill || s.hp <= 0) cmds.triggerWasted();
    }
  }

  if ((s.emote === 5 || s.emote === 6) && now - s.emoteStart > COMBAT.emoteHold * 1000) s.emote = 0;
}
