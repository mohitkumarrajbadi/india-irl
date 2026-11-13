"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Actor, type ActorFrame } from "@/avatar/actor";
import type { Look } from "@/avatar/appearance";
import { EMOTES } from "@/avatar/rig";
import { cycleTimePreset, env } from "@/gfx/env";
import { crashCue, emoteCue, footstep, hitCue, honk, setAmbient, setEngine, tickDistantTraffic, unlockAudio, wastedCue } from "@/game/audio";
import { touchInput } from "@/game/input";
import {
  atDrop,
  atPickup,
  clearJob,
  jobPrompt,
  jobReward,
  jobSecondsLeft,
  jobTitle,
  useJob,
} from "@/game/jobs";
import {
  bounceSpeed,
  crashDamage,
  crashSeverity,
  isFatalCrash,
  reportCrash,
  shouldEjectBike,
  tumbleRoll,
  wallCrashSeverity,
  WASTED,
} from "@/game/crash";
import {
  approachSpeed,
  COMBAT,
  FOOT,
  inStrikeCone,
  integrateKnockback,
} from "@/game/physics";
import { live, pendingHits, runtime, selfSay } from "@/game/runtime";
import { advanceStep, loadOnboard, markFirstEmote } from "@/game/onboarding";
import { grantMission, grantXp, reportHudFps, toast, useGame, type Hud } from "@/game/store";
import { clamp, damp, dampAngle } from "@/lib/math";
import { sendIntervalSec } from "@/net/interest";
import { samplePeer } from "@/net/interp";
import { sendHit, sendHonk, sendState, useNet, type Peer } from "@/net/store";
import { voice } from "@/net/voice";
import {
  driveAuthorityEnter,
  driveAuthorityExit,
  driveAuthorityStep,
  driveAuthorityUsesWorldColliders,
} from "@/game/sim/drive-authority";
import { takeDriveImpact } from "@/game/sim/drive-impact";
import {
  footAuthorityStep,
  footAuthoritySync,
  footAuthorityUsesWorldColliders,
} from "@/game/sim/foot-authority";
import { SPECS, seatWorld, stepDrive, type DriveState, type VehicleKind } from "@/vehicles/specs";
import { KIND_INFO } from "@/vehicles/traffic";
import { districtNameAt } from "@/world/generate";
import type { CityData } from "@/world/types";

const LOOK_SENS = 0.0022;
const PLAYER_RADIUS = FOOT.radius;
const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

type Mode = "foot" | "drive" | "passenger";

type Keys = { w: boolean; a: boolean; s: boolean; d: boolean; shift: boolean; space: boolean };

type Props = {
  city: CityData;
  name: string;
  look: Look;
};

const out = { x: 0, z: 0 };
const seat = { x: 0, y: 0, z: 0 };

function freeSeat(driver: Peer, peers: Map<string, Peer>): number {
  const spec = SPECS[driver.veh as 1 | 2 | 3];
  if (!spec) return -1;
  const used = new Set<number>([0]);
  peers.forEach((p) => {
    if (p.rideWith === driver.id) used.add(p.seat);
  });
  for (let i = 1; i < spec.seats.length; i += 1) if (!used.has(i)) return i;
  return -1;
}

export function PlayerController({ city, name, look }: Props) {
  const { camera, gl } = useThree();
  const actor = useMemo(() => new Actor(look, name, city.config), [look, name, city.config]);
  const lights = useRef<THREE.Group>(null);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  const s = useRef({
    mode: "foot" as Mode,
    x: city.spawn.x,
    z: city.spawn.z,
    y: 0,
    vy: 0,
    facing: city.spawn.yaw,
    speed: 0,
    actual: 0,
    dir: new THREE.Vector3(Math.sin(city.spawn.yaw), 0, Math.cos(city.spawn.yaw)),
    ds: { x: 0, z: 0, yaw: 0, speed: 0, steer: 0, roll: 0 } as DriveState,
    kind: 0 as VehicleKind,
    seat: 0,
    rideWith: null as string | null,
    emote: 0,
    emoteStart: 0,
    camYaw: city.spawn.yaw,
    camPitch: 0.34,
    zoom: 1,
    idle: 0,
    fov: 58,
    keys: { w: false, a: false, s: false, d: false, shift: false, space: false } as Keys,
    mouseX: 0,
    mouseY: 0,
    sample: 0,
    frames: 0,
    send: 0,
    sayHeard: 0,
    lastSent: "",
    hudKey: "",
    ambient: "",
    hangDone: false,
    lastKind: 2 as 1 | 2 | 3,
    parked: null as null | { x: number; z: number; yaw: number; kind: 1 | 2 | 3; until: number },
    kb: { x: 0, z: 0 },
    coyote: 0,
    stunUntil: 0,
    fightCd: 0,
    hp: 100,
    crashCd: 0,
    lastCrashToast: 0,
    /** >0 while WASTED freeze is active (performance.now deadline). */
    wastedUntil: 0,
    /** Camera shake amplitude — decays each frame, no allocations. */
    shake: 0,
  }).current;

  useEffect(
    () => () => {
      actor.dispose();
      setEngine(0, 0);
    },
    [actor],
  );
  useEffect(() => {
    live.x = s.x;
    live.z = s.z;
    live.yaw = s.facing;
    live.vehicle = 0;
    live.rideWith = null;
    live.emote = 0;
  }, [s]);

  const cmds = useRef({
    interact: () => {},
    vehicle: () => {},
    jobAction: () => {},
    summon: (_k: 1 | 2 | 3) => {},
    honkNow: () => {},
    emote: (_id: number) => {},
    strike: (_k: 0 | 1) => {},
    ejectCrash: (_severity: number, _nx: number, _nz: number) => {},
    triggerWasted: (_reason?: string) => {},
    applyCrashHit: (_sev: number, _nx: number, _nz: number, _speed: number) => false as boolean,
  });

  useEffect(() => {
    const grid = () => runtime.grid;

    const dismount = () => {
      const g = grid();
      if (s.mode === "drive") {
        const spec = SPECS[s.kind as 1 | 2 | 3];
        const sin = Math.sin(s.ds.yaw);
        const cos = Math.cos(s.ds.yaw);
        // Step out on the vehicle's left, the kerb side in left-hand traffic.
        const off = spec.width / 2 + 0.7;
        s.parked = {
          x: s.ds.x,
          z: s.ds.z,
          yaw: s.ds.yaw,
          kind: s.kind as 1 | 2 | 3,
          until: performance.now() + 90_000,
        };
        s.x = s.ds.x + cos * off;
        s.z = s.ds.z - sin * off;
        s.facing = s.ds.yaw;
      } else if (s.mode === "passenger") {
        const peer = s.rideWith ? useNet.getState().peerMap.get(s.rideWith) : undefined;
        const bx = peer ? peer.rx : s.x;
        const bz = peer ? peer.rz : s.z;
        const yaw = peer ? peer.ryaw : s.facing;
        s.x = bx + Math.cos(yaw) * 2.1;
        s.z = bz - Math.sin(yaw) * 2.1;
        s.facing = yaw;
      }
      if (g) {
        g.resolve(s.x, s.z, PLAYER_RADIUS, out);
        s.x = out.x;
        s.z = out.z;
      }
      s.mode = "foot";
      s.kind = 0;
      s.rideWith = null;
      s.speed = 0;
      s.y = 0;
      s.vy = 0;
      driveAuthorityExit({ x: s.x, y: s.y, z: s.z, yaw: s.facing });
      setEngine(0, 0);
    };

    /** Hard crash throw — scooter riders get yeeted; leave wreck parked. */
    const ejectCrash = (severity: number, nx: number, nz: number) => {
      if (s.mode !== "drive") return;
      const yaw = s.ds.yaw;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);
      s.parked = {
        x: s.ds.x,
        z: s.ds.z,
        yaw,
        kind: s.kind as 1 | 2 | 3,
        until: performance.now() + 45_000,
      };
      const throwDir = Math.hypot(nx, nz) > 1e-4 ? { x: nx, z: nz } : { x: cos, z: -sin };
      const inv = 1 / (Math.hypot(throwDir.x, throwDir.z) || 1);
      s.x = s.ds.x + throwDir.x * inv * 1.2;
      s.z = s.ds.z + throwDir.z * inv * 1.2;
      const g = grid();
      if (g) {
        g.resolve(s.x, s.z, PLAYER_RADIUS, out);
        s.x = out.x;
        s.z = out.z;
      }
      const force = 6 + severity * 14;
      s.kb.x = throwDir.x * inv * force;
      s.kb.z = throwDir.z * inv * force;
      s.vy = 3.2 + severity * 4.5;
      s.y = 0.35;
      s.facing = yaw;
      s.mode = "foot";
      s.kind = 0;
      s.rideWith = null;
      s.speed = 0;
      s.ds.speed = 0;
      s.stunUntil = performance.now() + 400 + severity * 500;
      driveAuthorityExit({ x: s.x, y: s.y, z: s.z, yaw: s.facing });
      setEngine(0, 0);
      hitCue(1.4);
      crashCue(1.1 + severity * 0.4);
    };

    /** Enter WASTED — freeze, overlay, then respawn. Idempotent. */
    const triggerWasted = () => {
      if (s.wastedUntil > 0) return;
      const now = performance.now();
      if (s.mode === "drive") {
        s.parked = {
          x: s.ds.x,
          z: s.ds.z,
          yaw: s.ds.yaw,
          kind: s.kind as 1 | 2 | 3,
          until: now + 45_000,
        };
        s.mode = "foot";
        s.kind = 0;
        s.ds.speed = 0;
        driveAuthorityExit({ x: s.x, y: 0, z: s.z, yaw: s.facing });
      } else if (s.mode === "passenger") {
        s.mode = "foot";
        s.kind = 0;
        s.rideWith = null;
      }
      s.speed = 0;
      s.kb.x = 0;
      s.kb.z = 0;
      s.vy = 0;
      s.y = 0;
      s.hp = 0;
      s.shake = Math.max(s.shake, 0.9);
      s.stunUntil = now + WASTED.holdMs;
      s.wastedUntil = now + WASTED.holdMs;
      setEngine(0, 0);
      wastedCue();
      useGame.setState({ wasted: true });
    };

    /**
     * Shared vehicle impact: damage, bounce, tumble, optional eject / WASTED.
     * @returns true if player left the vehicle or wasted (stop further collision work).
     */
    const applyCrashHit = (sev: number, nx: number, nz: number, speedBefore: number): boolean => {
      if (sev < 0.2 || s.mode !== "drive") return false;
      const dmg = crashDamage(sev);
      if (dmg > 0) s.hp = Math.max(0, s.hp - dmg);
      s.shake = Math.min(1.35, s.shake + 0.25 + sev * 0.9);
      s.ds.roll += tumbleRoll(sev, Math.random());
      s.ds.speed = bounceSpeed(speedBefore, sev);
      crashCue(0.7 + sev);
      reportCrash(s.ds.x, s.ds.z, sev, shouldEjectBike(sev, s.kind));
      const fatal = isFatalCrash(sev, speedBefore) || s.hp <= 0;
      if (shouldEjectBike(sev, s.kind) && !fatal) {
        ejectCrash(sev, nx, nz);
        if (s.hp <= 0) triggerWasted();
        return true;
      }
      // Hard car/auto smash — tumble out then maybe waste.
      if (sev >= 0.78 && s.kind !== 2) {
        ejectCrash(sev * 0.85, nx, nz);
        if (fatal || s.hp <= 0) triggerWasted();
        return true;
      }
      if (fatal) {
        triggerWasted();
        return true;
      }
      return false;
    };

    const summon = (kind: 1 | 2 | 3) => {
      if (s.wastedUntil > 0) return;
      const spec = SPECS[kind];
      if (s.mode === "passenger") dismount();
      if (s.mode === "foot") {
        const yaw = s.facing;
        s.ds.x = s.x + Math.sin(yaw) * 1.6;
        s.ds.z = s.z + Math.cos(yaw) * 1.6;
        s.ds.yaw = yaw;
        s.ds.speed = 0;
      } else {
        s.ds.speed *= 0.3;
      }
      s.ds.steer = 0;
      s.ds.roll = 0;
      s.mode = "drive";
      s.kind = kind;
      s.lastKind = kind;
      s.parked = null;
      s.seat = 0;
      s.emote = 0;
      unlockAudio();
      setEngine(kind, 0);
      driveAuthorityEnter(kind, { x: s.ds.x, z: s.ds.z, yaw: s.ds.yaw });
      toast(`${spec.name} booked. ${spec.blurb}`);
      grantMission("ride");
    };

    const nearestRide = (): Peer | null => {
      const { peerMap } = useNet.getState();
      let best: Peer | null = null;
      let bestD = 4.6 * 4.6;
      peerMap.forEach((p) => {
        if (p.veh === 0 || p.passenger || p.snaps.length === 0) return;
        const d = (p.rx - s.x) ** 2 + (p.rz - s.z) ** 2;
        if (d < bestD && freeSeat(p, peerMap) >= 0) {
          bestD = d;
          best = p;
        }
      });
      return best;
    };

    const remountParked = (): boolean => {
      const p = s.parked;
      if (!p || performance.now() > p.until) {
        s.parked = null;
        return false;
      }
      if ((p.x - s.x) ** 2 + (p.z - s.z) ** 2 > 5.5 * 5.5) return false;
      s.ds.x = p.x;
      s.ds.z = p.z;
      s.ds.yaw = p.yaw;
      s.ds.speed = 0;
      s.ds.steer = 0;
      s.ds.roll = 0;
      s.mode = "drive";
      s.kind = p.kind;
      s.lastKind = p.kind;
      s.seat = 0;
      s.emote = 0;
      s.parked = null;
      unlockAudio();
      setEngine(p.kind, 0);
      driveAuthorityEnter(p.kind, { x: s.ds.x, z: s.ds.z, yaw: s.ds.yaw });
      toast(`Back in your ${SPECS[p.kind].name}`);
      return true;
    };

    /** GTA-style F: exit, hop into peer ride, remount parked, or summon last. */
    const vehicle = () => {
      if (s.wastedUntil > 0) return;
      if (s.mode !== "foot") {
        dismount();
        return;
      }
      const ride = nearestRide();
      if (ride) {
        const idx = freeSeat(ride, useNet.getState().peerMap);
        if (idx < 0) return;
        s.mode = "passenger";
        s.rideWith = ride.id;
        s.kind = ride.veh as VehicleKind;
        s.seat = idx;
        s.emote = 0;
        toast(`Riding with ${ride.name}`);
        grantMission("ride");
        return;
      }
      if (remountParked()) return;
      summon(s.lastKind);
    };

    const completeJob = () => {
      const j = useJob.getState();
      if (!j.kind) return;
      grantXp(jobReward(j.kind), jobTitle(j.kind));
      if (j.kind === "delivery" || j.kind === "ferry") grantMission("ride");
      if (j.kind === "chai") {
        cmds.current.emote(4);
        grantMission("emote");
      }
      clearJob();
    };

    /** E = job / plaza action (not vehicle). */
    const jobAction = () => {
      const j = useJob.getState();
      if (!j.kind) return;
      if (jobSecondsLeft(j) === 0) {
        clearJob();
        toast("Job timed out");
        return;
      }
      if (j.kind === "delivery") {
        if (j.stage === "pickup" && atPickup(j, s.x, s.z)) {
          useJob.setState({ stage: "carry" });
          toast(`Parcel on · head to ${j.toLabel}`);
          return;
        }
        if (j.stage === "carry" && atDrop(j, s.x, s.z) && s.mode !== "foot") {
          completeJob();
          return;
        }
      }
      if (j.kind === "chai") {
        if (j.stage === "pickup" && atPickup(j, s.x, s.z)) {
          useJob.setState({ stage: "carry" });
          cmds.current.emote(4);
          toast(`Chai tray · serve at ${j.toLabel}`);
          return;
        }
        if (j.stage === "carry" && atDrop(j, s.x, s.z)) {
          completeJob();
          return;
        }
      }
      if (j.kind === "ferry") {
        if (j.needPassenger && s.mode === "drive" && s.kind === 3) {
          // Passenger presence checked via peers riding with us
          const { peerMap, selfId } = useNet.getState();
          let has = false;
          peerMap.forEach((p) => {
            if (p.rideWith === selfId) has = true;
          });
          if (has) {
            useJob.setState({ needPassenger: false });
            toast(`Friend aboard · drop at ${j.toLabel}`);
            return;
          }
        }
        if (!j.needPassenger && atDrop(j, s.x, s.z)) {
          const { peerMap, selfId } = useNet.getState();
          let has = false;
          peerMap.forEach((p) => {
            if (p.rideWith === selfId) has = true;
          });
          if (has || s.mode === "drive") {
            completeJob();
          }
        }
      }
    };

    const interact = () => {
      jobAction();
    };

    const setKey = (code: string, down: boolean) => {
      const k = s.keys;
      switch (code) {
        case "KeyW": case "ArrowUp": k.w = down; break;
        case "KeyA": case "ArrowLeft": k.a = down; break;
        case "KeyS": case "ArrowDown": k.s = down; break;
        case "KeyD": case "ArrowRight": k.d = down; break;
        case "ShiftLeft": case "ShiftRight": k.shift = down; break;
        case "Space": k.space = down; break;
        default: break;
      }
    };

    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };

    const honkNow = () => {
      if (s.kind > 0) {
        unlockAudio();
        honk(s.kind);
        sendHonk();
      }
    };
    const emote = (id: number) => {
      if (id === 3 && s.mode !== "foot") return;
      if ((id === 5 || id === 6) && s.mode !== "foot") return;
      if (id === 5 || id === 6) {
        cmds.current.strike(id === 6 ? 1 : 0);
        return;
      }
      s.emote = s.emote === id ? 0 : id;
      s.emoteStart = performance.now();
      if (s.emote) {
        unlockAudio();
        emoteCue(s.emote);
        toast(EMOTES[s.emote]?.name ?? "Emote");
        grantMission("emote");
        const before = loadOnboard();
        if (!before.firstEmoteDone) {
          markFirstEmote();
          toast("Nice — wave at someone nearby (Z)");
          advanceStep("wave_prompt");
          useGame.setState({ highlightJob: false, onboardUi: before.intent ? null : "intent" });
        }
      }
    };
    const strike = (kind: 0 | 1) => {
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
        toast(`${kind === 1 ? "Kick" : "Punch"} · ${hitName}`);
        // Crowd reacts to street fights.
        const pedSim = runtime.peds;
        if (pedSim) {
          for (const ped of pedSim.peds) {
            const d2 = (ped.x - s.x) ** 2 + (ped.z - s.z) ** 2;
            if (d2 < 10 * 10) {
              pedSim.reactToHit(ped, s.x, s.z, now);
              break;
            }
          }
        }
        return;
      }
      // Hit sidewalk NPCs — some flee, some fight back.
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
          if (reaction === "fight") {
            toast(kind === 1 ? "Kick — they swung back!" : "Punch — street fight!");
          } else {
            toast(kind === 1 ? "Kick — they bolted" : "Punch — crowd scatters");
          }
          return;
        }
      }
      toast(kind === 1 ? "Kick" : "Punch");
    };
    cmds.current = { interact, vehicle, jobAction, summon, honkNow, emote, strike, ejectCrash, triggerWasted, applyCrashHit };

    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (e.code === "Space" || e.code === "Tab") e.preventDefault();
      if (e.repeat) {
        if (e.code === "Tab") e.preventDefault();
        return;
      }
      setKey(e.code, true);
      switch (e.code) {
        case "KeyF": vehicle(); break;
        case "KeyE": interact(); break;
        case "Digit1":
          if (useGame.getState().emoteWheel) emote(1);
          else summon(1);
          break;
        case "Digit2":
          if (useGame.getState().emoteWheel) emote(2);
          else summon(2);
          break;
        case "Digit3":
          if (useGame.getState().emoteWheel) emote(3);
          else summon(3);
          break;
        case "Digit4":
          if (useGame.getState().emoteWheel) emote(4);
          break;
        case "Digit5":
          if (useGame.getState().emoteWheel) emote(5);
          break;
        case "Digit6":
          if (useGame.getState().emoteWheel) emote(6);
          break;
        case "KeyR": strike(0); break;
        case "KeyG": strike(1); break;
        case "KeyH": honkNow(); break;
        case "KeyT": toast(`Time: ${cycleTimePreset()}`); break;
        case "KeyQ": useGame.getState().cycleQualityPref(); break;
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
        case "Enter":
          e.preventDefault();
          useGame.setState({ chatOpen: true });
          break;
        case "KeyZ": emote(1); break;
        case "KeyX": emote(2); break;
        case "KeyC": emote(3); break;
        case "KeyV": emote(4); break;
        case "Escape":
          if (useJob.getState().kind) {
            clearJob();
            toast("Job cancelled");
          }
          break;
        default: break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      setKey(e.code, false);
      if (e.code === "Tab") useGame.setState({ emoteWheel: false });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== gl.domElement) return;
      s.mouseX += e.movementX;
      s.mouseY += e.movementY;
    };
    const onWheel = (e: WheelEvent) => {
      s.zoom = clamp(s.zoom * (e.deltaY > 0 ? 1.08 : 0.92), 0.55, 1.9);
    };
    const release = () => {
      const k = s.keys;
      k.w = k.a = k.s = k.d = k.shift = k.space = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("blur", release);
    return () => {
      release();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", release);
    };
  }, [gl, s]);

  const frame = useMemo<ActorFrame>(
    () => ({ x: 0, z: 0, yaw: 0, speed: 0, vehicle: 0, seat: 0, emote: 0, emoteT: 0, passenger: false, roll: 0, y: 0 }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const grid = runtime.grid;
    const { peerMap } = useNet.getState();
    const k = s.keys;

    // Drain touch action pulses (same codes as keyboard).
    if (touchInput.pulses.length) {
      const pulses = touchInput.pulses.splice(0);
      for (const code of pulses) {
        if (code === "KeyF") cmds.current.vehicle();
        else if (code === "KeyE") cmds.current.interact();
        else if (code === "Digit1") cmds.current.summon(1);
        else if (code === "Digit2") cmds.current.summon(2);
        else if (code === "Digit3") cmds.current.summon(3);
        else if (code === "KeyH") cmds.current.honkNow();
        else if (code === "KeyZ") cmds.current.emote(1);
        else if (code === "KeyX") cmds.current.emote(2);
        else if (code === "KeyC") cmds.current.emote(3);
        else if (code === "KeyV") cmds.current.emote(4);
        else if (code === "KeyR") cmds.current.strike(0);
        else if (code === "KeyG") cmds.current.strike(1);
      }
    }

    // ---- look ----
    s.mouseX += touchInput.lookDX;
    s.mouseY += touchInput.lookDY;
    touchInput.lookDX = 0;
    touchInput.lookDY = 0;
    s.camYaw -= s.mouseX * LOOK_SENS;
    s.camPitch = clamp(s.camPitch + s.mouseY * LOOK_SENS, -0.2, 1.1);
    if (s.mouseX !== 0 || s.mouseY !== 0) s.idle = 0;
    else s.idle += dt;
    s.mouseX = 0;
    s.mouseY = 0;

    const touchF = touchInput.moving ? touchInput.forward : 0;
    const touchS = touchInput.moving ? touchInput.strafe : 0;
    const forward = (k.w ? 1 : 0) - (k.s ? 1 : 0) + touchF;
    const strafe = (k.d ? 1 : 0) - (k.a ? 1 : 0) + touchS;
    const sprint = k.shift || touchInput.sprint;
    const jump = k.space || touchInput.jump;

    // Drain incoming hits (knockback + HP).
    if (pendingHits.length) {
      const hits = pendingHits.splice(0);
      for (const h of hits) {
        if (s.mode !== "foot") continue;
        const force = h.kind === 1 ? COMBAT.kickForce : COMBAT.punchForce;
        const dmg = h.kind === 1 ? COMBAT.kickDamage : COMBAT.punchDamage;
        const fx = Math.sin(s.facing);
        const fz = Math.cos(s.facing);
        // Push away from attacker if we know them; else push opposite facing.
        const peer = peerMap.get(h.from);
        let nx = -fx;
        let nz = -fz;
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
        if (s.hp <= 0) cmds.current.triggerWasted();
      }
    }
    // Soft HP regen out of combat (not while WASTED).
    if (s.wastedUntil <= 0 && s.hp < 100 && now > s.stunUntil + 2500) s.hp = Math.min(100, s.hp + 8 * dt);
    live.hp = s.hp;

    // Pedestrian counters — street fights cut both ways.
    if (s.mode === "foot" && s.wastedUntil <= 0 && now > s.stunUntil) {
      const pedSim = runtime.peds;
      if (pedSim?.tryCounter(s.x, s.z, now)) {
        const fx = Math.sin(s.facing);
        const fz = Math.cos(s.facing);
        s.kb.x -= fx * COMBAT.punchForce * 0.85;
        s.kb.z -= fz * COMBAT.punchForce * 0.85;
        s.vy = Math.max(s.vy, 1.4);
        s.stunUntil = now + COMBAT.stun * 900;
        s.hp = Math.max(0, s.hp - COMBAT.punchDamage * 0.7);
        hitCue(1);
        s.shake = Math.min(1.2, s.shake + 0.4);
        if (now - s.lastCrashToast > 1200) {
          s.lastCrashToast = now;
          toast("Crowd fought back!");
        }
        if (s.hp <= 0) cmds.current.triggerWasted();
      }
    }

    // Clear short fight poses.
    if ((s.emote === 5 || s.emote === 6) && now - s.emoteStart > COMBAT.emoteHold * 1000) s.emote = 0;

    // ---- WASTED: freeze movement, then respawn at city spawn ----
    if (s.wastedUntil > 0) {
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
        // Drift camera down toward the body — cheap Vice City vibe.
        s.camPitch = damp(s.camPitch, 0.72, 1.8, dt);
        s.shake *= Math.exp(-3.5 * dt);
      }
      // Fall through to camera / actor / HUD below — skip locomotion.
    } else if (s.mode === "foot") {
      const stunned = now < s.stunUntil;
      const usedSimFoot = footAuthorityStep(s, {
        forward,
        strafe,
        camYaw: s.camYaw,
        facing: s.facing,
        sprint,
        jump,
        stunned,
      }, dt);
      if (!usedSimFoot) {
        const mag = Math.hypot(forward, strafe);
        const moving = mag > 0.04 && !stunned;
        if (moving && s.emote !== 0 && s.emote < 5) s.emote = 0;
        const pace = Math.min(1, mag);
        const grounded = s.y <= 0.001;
        if (grounded) s.coyote = FOOT.coyote;
        else s.coyote = Math.max(0, s.coyote - dt);
        const target = moving ? (sprint ? FOOT.sprint : FOOT.walk) * pace : 0;
        const airMul = grounded ? 1 : FOOT.airControl;
        s.speed = approachSpeed(s.speed, target * airMul, dt, moving && grounded);
        if (moving) {
          const inv = 1 / mag;
          const sin = Math.sin(s.camYaw);
          const cos = Math.cos(s.camYaw);
          s.dir.set(forward * inv * sin - strafe * inv * cos, 0, forward * inv * cos + strafe * inv * sin);
        }
        const px = s.x;
        const pz = s.z;
        const kb = integrateKnockback(s.kb, dt);
        let nx = px + s.dir.x * s.speed * dt + kb.dx;
        let nz = pz + s.dir.z * s.speed * dt + kb.dz;
        if (grid) {
          grid.resolve(nx, nz, PLAYER_RADIUS, out);
          nx = out.x;
          nz = out.z;
        }
        const sim = runtime.traffic;
        if (sim) {
          for (const a of sim.agents) {
            const info = KIND_INFO[a.kind];
            const r = (info.len + info.wid) * 0.25 + PLAYER_RADIUS;
            const dx = nx - a.x;
            const dz = nz - a.z;
            const d2 = dx * dx + dz * dz;
            if (d2 < r * r && d2 > 1e-6) {
              const d = Math.sqrt(d2);
              nx = a.x + (dx / d) * r;
              nz = a.z + (dz / d) * r;
              s.speed *= 0.88;
            }
          }
        }
        s.x = nx;
        s.z = nz;
        s.actual = dt > 0 ? Math.hypot(s.x - px, s.z - pz) / dt : 0;
        if (jump && !stunned && (grounded || s.coyote > 0) && s.vy <= 0.05) {
          s.vy = FOOT.jump;
          s.coyote = 0;
        }
        if (s.vy !== 0 || s.y > 0) {
          s.vy -= FOOT.gravity * dt;
          const prevY = s.y;
          s.y = Math.max(0, s.y + s.vy * dt);
          if (s.y === 0) {
            if (prevY > 0.15 && s.vy < -4) s.speed *= 0.72;
            s.vy = 0;
          }
        }
        if (s.actual > 0.2 && !stunned) s.facing = dampAngle(s.facing, Math.atan2(s.dir.x, s.dir.z), 12, dt);
      } else if (s.emote !== 0 && s.emote < 5 && Math.hypot(forward, strafe) > 0.04) {
        s.emote = 0;
      }
      // Soft traffic push still applies on sim foot (NPC fleet is arcade).
      if (usedSimFoot && !footAuthorityUsesWorldColliders() && grid) {
        grid.resolve(s.x, s.z, PLAYER_RADIUS, out);
        s.x = out.x;
        s.z = out.z;
      }
    } else if (s.mode === "drive") {
      const spec = SPECS[s.kind as 1 | 2 | 3];
      const usedRapier = driveAuthorityStep(s.ds, s.kind, {
        forward,
        strafe,
        yaw: s.ds.yaw,
        sprint,
        jump,
        speed: s.ds.speed,
      });
      if (!usedRapier) {
        stepDrive(
          s.ds,
          { throttle: clamp(forward, -1, 1), steer: clamp(strafe, -1, 1), boost: sprint, handbrake: jump },
          spec,
          dt,
        );
      }
      const rapierHit = usedRapier ? takeDriveImpact() : null;
      if (rapierHit && now > s.crashCd) {
        const sev = wallCrashSeverity(0.4 + Math.min(2, Math.abs(rapierHit.speed) * 0.08), rapierHit.speed);
        if (sev > 0.35) {
          s.crashCd = now + 850;
          cmds.current.applyCrashHit(sev, rapierHit.fx || Math.sin(s.ds.yaw), rapierHit.fz || Math.cos(s.ds.yaw), rapierHit.speed);
        }
      }
      // Speed breakers (extra v=7) — bump + slow like real Indian arterials.
      for (const e of city.extras) {
        if (e.v !== 7) continue;
        const dx = s.ds.x - e.x;
        const dz = s.ds.z - e.z;
        if (dx * dx + dz * dz < 2.8 * 2.8) {
          s.ds.speed *= Math.exp(-2.8 * dt);
          break;
        }
      }
      if (grid && !(usedRapier && driveAuthorityUsesWorldColliders())) {
        const bx = s.ds.x;
        const bz = s.ds.z;
        const spd0 = s.ds.speed;
        grid.resolve(bx, bz, spec.radius, out);
        const pushed = Math.hypot(out.x - bx, out.z - bz);
        if (pushed > 1e-4) {
          const nx = out.x - bx;
          const nz = out.z - bz;
          s.ds.x = out.x;
          s.ds.z = out.z;
          const sev = wallCrashSeverity(pushed, spd0);
          if (sev > 0.35 && now > s.crashCd) {
            s.crashCd = now + 850;
            if (cmds.current.applyCrashHit(sev, nx || Math.sin(s.ds.yaw), nz || Math.cos(s.ds.yaw), spd0)) {
              /* ejected / wasted */
            }
          } else {
            s.ds.speed *= 1 - clamp(pushed * 6 + Math.abs(spd0) * 0.04, 0, 0.78);
          }
        }
      }
      const sim = runtime.traffic;
      if (sim && s.mode === "drive") {
        const mine = (spec.length + spec.width) * 0.25;
        for (const a of sim.agents) {
          const info = KIND_INFO[a.kind];
          const r = (info.len + info.wid) * 0.25 + mine;
          const dx = s.ds.x - a.x;
          const dz = s.ds.z - a.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const overlap = r - d;
            const nx = dx / d;
            const nz = dz / d;
            const spd0 = s.ds.speed;
            // Separate bodies.
            s.ds.x += nx * overlap * 0.55;
            s.ds.z += nz * overlap * 0.55;
            a.x -= nx * overlap * 1.15;
            a.z -= nz * overlap * 1.15;
            const closing = Math.abs(spd0) + Math.abs(a.speed);
            const sev = crashSeverity(closing);
            // Fling traffic (cheap Vice City smash).
            a.speed *= 0.28 + (1 - sev) * 0.35;
            a.yaw += (Math.random() - 0.5) * sev * 1.6;
            a.x -= nx * sev * (2.2 + sev * 3);
            a.z -= nz * sev * (2.2 + sev * 3);
            a.ghost = Math.max(a.ghost, 0.7 + sev * 1.6);
            if (sev > 0.28 && now > s.crashCd) {
              s.crashCd = now + 650;
              if (cmds.current.applyCrashHit(sev, nx, nz, spd0)) break;
            } else {
              s.ds.speed *= 1 - clamp(0.12 + closing * 0.012, 0.12, 0.55);
            }
          }
        }
      }
      if (s.mode === "drive") {
        s.x = s.ds.x;
        s.z = s.ds.z;
        s.actual = Math.abs(s.ds.speed);
      }
    } else if (s.mode === "passenger") {
      const driver = s.rideWith ? peerMap.get(s.rideWith) : undefined;
      if (!driver || driver.veh === 0 || driver.passenger || driver.snaps.length === 0) {
        // The driver left. Step off where we are.
        s.mode = "foot";
        s.kind = 0;
        s.rideWith = null;
        toast("Your ride ended");
      } else {
        samplePeer(driver, now);
        const spec = SPECS[driver.veh as 1 | 2 | 3];
        seatWorld(spec, s.seat, driver.rx, driver.rz, driver.ryaw, seat);
        s.x = seat.x;
        s.z = seat.z;
        s.facing = driver.ryaw;
        s.actual = Math.abs(driver.rspeed);
        s.ds.speed = driver.rspeed;
        s.kind = driver.veh as VehicleKind;
      }
    }

    const vehicular = s.mode !== "foot";
    const heading = s.mode === "drive" ? s.ds.yaw : s.facing;

    // ---- camera ----
    if (vehicular && s.actual > 2 && s.idle > 1.3) {
      const want = s.ds.speed < -0.5 && s.mode === "drive" ? heading + Math.PI : heading;
      s.camYaw = dampAngle(s.camYaw, want, 2.4, dt);
    }
    const spec = vehicular && s.kind > 0 ? SPECS[s.kind as 1 | 2 | 3] : null;
    const wantDist = (spec ? spec.camDist : 5.2) * s.zoom;
    const focusY = spec ? spec.camHeight : 1.35 + s.y * 0.6;
    const cosP = Math.cos(s.camPitch);
    const sinP = Math.sin(s.camPitch);
    const fx = s.x;
    const fz = s.z;
    const dirX = -Math.sin(s.camYaw) * cosP;
    const dirZ = -Math.cos(s.camYaw) * cosP;
    let dist = wantDist;
    if (grid) {
      // March the boom outward and stop short of the first building it would pass through.
      const steps = 10;
      for (let i = 1; i <= steps; i += 1) {
        const d = (wantDist * i) / steps;
        const y = Math.max(0.5, focusY + d * sinP);
        if (grid.blocked(fx + dirX * d, y, fz + dirZ * d, 0.35)) {
          dist = Math.max(1.3, d - wantDist / steps - 0.2);
          break;
        }
      }
    }
    camera.position.set(fx + dirX * dist, Math.max(0.35, focusY + dist * sinP), fz + dirZ * dist);
    camera.lookAt(fx, focusY, fz);
    // Screen shake — 2 float ops, no objects (Vice City impact punch).
    if (s.shake > 0.02) {
      const sh = s.shake;
      camera.position.x += (Math.random() - 0.5) * sh * 0.42;
      camera.position.y += (Math.random() - 0.5) * sh * 0.28;
      camera.position.z += (Math.random() - 0.5) * sh * 0.42;
      if (s.wastedUntil <= 0) s.shake *= Math.exp(-7 * dt);
    } else s.shake = 0;

    const persp = camera as THREE.PerspectiveCamera;
    const wantFov = 58 + (vehicular ? clamp(s.actual * 0.38, 0, 10) : sprint && s.actual > 5 ? 3 : 0);
    s.fov = damp(s.fov, wantFov, 4, dt);
    if (Math.abs(persp.fov - s.fov) > 0.05) {
      persp.fov = s.fov;
      persp.updateProjectionMatrix();
    }

    // ---- actor ----
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
    actor.update(frame, dt, now, camera.position.x, camera.position.z);
    if (selfSay.seq !== s.sayHeard) {
      s.sayHeard = selfSay.seq;
      actor.say(selfSay.text, selfSay.until);
    }

    // ---- headlights ----
    const lightsRig = lights.current;
    if (lightsRig) {
      const on = s.mode === "drive";
      lightsRig.visible = on;
      if (on) {
        lightsRig.position.set(s.ds.x, 0.8, s.ds.z);
        lightsRig.rotation.y = s.ds.yaw;
        const power = env.night * 120;
        for (const c of lightsRig.children) if ((c as THREE.SpotLight).isSpotLight) (c as THREE.SpotLight).intensity = power;
      }
    }

    // ---- audio ----
    if (s.mode === "foot") {
      setEngine(0, 0);
      footstep(s.actual, dt);
    } else if (s.mode === "drive") {
      setEngine(s.kind, s.ds.speed);
    } else {
      setEngine(0, 0);
    }
    const district = districtNameAt(city, s.x, s.z);
    const kindHint = (() => {
      if (env.night > 0.72) return "night";
      const d = district.toLowerCase();
      if (/park|garden|valley|cheruvu|cubbon|leisure/.test(d)) return "park";
      if (/market|road|peth|old|sector|madhapur|hsr|indiranagar|fc /.test(d)) return "market";
      return "tech";
    })();
    if (kindHint !== s.ambient) {
      s.ambient = kindHint;
      setAmbient(kindHint, 1);
    }
    tickDistantTraffic(env.night, dt);

    // ---- publish ----
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

    s.send += dt;
    const snapshot = `${live.x.toFixed(1)}|${live.z.toFixed(1)}|${live.yaw.toFixed(2)}|${live.vehicle}|${live.emote}|${live.seat}|${live.rideWith}`;
    const changed = snapshot !== s.lastSent;
    const interval = sendIntervalSec({
      changed,
      speed: live.speed,
      vehicle: live.vehicle,
      emote: live.emote,
      peerCount: peerMap.size,
    });
    if (s.send > interval) {
      s.send = 0;
      s.lastSent = snapshot;
      sendState();
    }

    // Social proximity — hang mission when someone is nearby (~12 m)
    if (!s.hangDone && peerMap.size > 0) {
      let near = false;
      peerMap.forEach((p) => {
        if ((p.rx - s.x) ** 2 + (p.rz - s.z) ** 2 < 144) near = true;
      });
      if (near) {
        s.hangDone = true;
        grantMission("hang");
      }
    }

    // Ferry: auto-detect passenger aboard
    {
      const j = useJob.getState();
      if (j.kind === "ferry" && j.needPassenger && s.mode === "drive") {
        const selfId = useNet.getState().selfId;
        let has = false;
        peerMap.forEach((p) => {
          if (p.rideWith === selfId) has = true;
        });
        if (has) {
          useJob.setState({ needPassenger: false });
          toast(`Friend aboard · drop at ${j.toLabel}`);
        }
      }
      if (j.kind && jobSecondsLeft(j) === 0) {
        clearJob();
        toast("Job timed out");
      }
    }

    // ---- HUD at 4 Hz ----
    s.frames += 1;
    s.sample += dt;
    if (s.sample >= 0.25) {
      const fps = Math.round(s.frames / s.sample);
      const deg = ((((-s.camYaw * 180) / Math.PI) % 360) + 360) % 360;
      const selfId = useNet.getState().selfId;
      let hasPassenger = false;
      peerMap.forEach((p) => {
        if (p.rideWith === selfId) hasPassenger = true;
      });
      const j = useJob.getState();
      let prompt =
        jobPrompt(j, {
          x: s.x,
          z: s.z,
          mode: s.mode,
          vehicle: s.mode === "foot" ? 0 : s.kind,
          hasPassenger,
        }) ?? "";
      if (!prompt) {
        if (s.mode === "foot") {
          const near = (() => {
            let best: Peer | null = null;
            let bd = 4.6 * 4.6;
            peerMap.forEach((p) => {
              if (p.veh === 0 || p.passenger || p.snaps.length === 0) return;
              const d = (p.rx - s.x) ** 2 + (p.rz - s.z) ** 2;
              if (d < bd && freeSeat(p, peerMap) >= 0) {
                bd = d;
                best = p;
              }
            });
            return best as Peer | null;
          })();
          if (near) prompt = `F  Hop in with ${near.name}`;
          else if (s.parked && performance.now() < s.parked.until && (s.parked.x - s.x) ** 2 + (s.parked.z - s.z) ** 2 < 5.5 * 5.5) {
            prompt = `F  Get in ${SPECS[s.parked.kind].name}`;
          } else prompt = "F  Call a ride · 1 Auto · 2 Scooter · 3 Cab";
        } else prompt = "F  Hop off";
      }
      const hud: Hud = {
        fps,
        x: s.x,
        z: s.z,
        kmh: Math.round(Math.abs(live.speed) * 3.6),
        heading: `${DIRS[Math.round(deg / 45) % 8]} ${Math.round(deg)}°`,
        district: districtNameAt(city, s.x, s.z),
        mode: s.mode,
        vehicle: s.mode === "foot" ? 0 : s.kind,
        prompt,
        hour: env.hour,
        hp: Math.round(s.hp),
      };
      useGame.setState({ hud });
      reportHudFps(fps);
      s.sample = 0;
      s.frames = 0;
    }
  }, -1);

  return (
    <>
      <primitive object={actor.group} />
      <group ref={lights} visible={false}>
        <spotLight position={[0.45, 0.2, 1.4]} angle={0.5} penumbra={0.7} distance={60} decay={1.4} color="#fff2d0" target={lightTarget} />
        <spotLight position={[-0.45, 0.2, 1.4]} angle={0.5} penumbra={0.7} distance={60} decay={1.4} color="#fff2d0" target={lightTarget} />
        <primitive object={lightTarget} position={[0, -0.3, 18]} />
      </group>
    </>
  );
}
