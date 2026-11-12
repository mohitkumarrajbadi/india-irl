"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Actor, type ActorFrame } from "@/avatar/actor";
import type { Look } from "@/avatar/appearance";
import { EMOTES } from "@/avatar/rig";
import { cycleTimePreset, env } from "@/gfx/env";
import { emoteCue, footstep, hitCue, honk, setAmbient, setEngine, tickDistantTraffic, unlockAudio } from "@/game/audio";
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
      setEngine(0, 0);
    };

    const summon = (kind: 1 | 2 | 3) => {
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
      toast(`Back in your ${SPECS[p.kind].name}`);
      return true;
    };

    /** GTA-style F: exit, hop into peer ride, remount parked, or summon last. */
    const vehicle = () => {
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
      if (s.mode !== "foot") return;
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
      } else {
        toast(kind === 1 ? "Kick" : "Punch");
      }
    };
    cmds.current = { interact, vehicle, jobAction, summon, honkNow, emote, strike };

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
        toast(h.kind === 1 ? "Got kicked!" : "Got punched!");
        if (s.hp <= 0) {
          s.hp = 100;
          toast("Down — but you’re back up. Rematch?");
        }
      }
    }
    // Soft HP regen out of combat.
    if (s.hp < 100 && now > s.stunUntil + 2500) s.hp = Math.min(100, s.hp + 8 * dt);
    live.hp = s.hp;

    // Clear short fight poses.
    if ((s.emote === 5 || s.emote === 6) && now - s.emoteStart > COMBAT.emoteHold * 1000) s.emote = 0;

    // ---- simulate ----
    if (s.mode === "foot") {
      const stunned = now < s.stunUntil;
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
          if (prevY > 0.15 && s.vy < -4) s.speed *= 0.72; // landing impact
          s.vy = 0;
        }
      }
      if (s.actual > 0.2 && !stunned) s.facing = dampAngle(s.facing, Math.atan2(s.dir.x, s.dir.z), 12, dt);
    } else if (s.mode === "drive") {
      const spec = SPECS[s.kind as 1 | 2 | 3];
      stepDrive(s.ds, { throttle: clamp(forward, -1, 1), steer: clamp(strafe, -1, 1), boost: sprint, handbrake: jump }, spec, dt);
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
      if (grid) {
        const bx = s.ds.x;
        const bz = s.ds.z;
        grid.resolve(bx, bz, spec.radius, out);
        const pushed = Math.hypot(out.x - bx, out.z - bz);
        if (pushed > 1e-4) {
          s.ds.x = out.x;
          s.ds.z = out.z;
          // Harder wall response — lose momentum with impact feel.
          const impact = clamp(pushed * 6 + Math.abs(s.ds.speed) * 0.04, 0, 0.72);
          s.ds.speed *= 1 - impact;
        }
      }
      const sim = runtime.traffic;
      if (sim) {
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
            s.ds.x += (dx / d) * overlap;
            s.ds.z += (dz / d) * overlap;
            const closing = Math.abs(s.ds.speed) + Math.abs(a.speed);
            s.ds.speed *= 1 - clamp(0.12 + closing * 0.012, 0.12, 0.55);
            a.speed *= 0.65;
          }
        }
      }
      s.x = s.ds.x;
      s.z = s.ds.z;
      s.actual = Math.abs(s.ds.speed);
    } else {
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
