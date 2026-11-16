/** Wasted / eject / shared vehicle impact commands. */
import { crashCue, hitCue, setEngine, wastedCue } from "@/game/audio";
import {
  chassisDamage,
  crashDamage,
  isFatalCrash,
  reportCrash,
  tumbleRoll,
  KHATAM,
} from "@/game/crash";
import {
  shouldEjectCabinBody,
  shouldSeparateRider,
} from "@/game/collision-response";
import { ejectImpulse, impactShake, naturalBounce, softSpeedScrub } from "@/game/crash-feel";
import { live, runtime } from "@/game/runtime";
import { driveAuthorityExit } from "@/game/sim/drive-authority";
import { toast, useGame } from "@/game/store";
import { sendClaim } from "@/net/store";
import { PLAYER_PHYSICS } from "@/vehicles/physics-props";
import { releaseWorldParked } from "@/game/world-vehicles";
import { resolveOut, PLAYER_RADIUS } from "./constants.ts";
import type { CrashHitOpts, PlayerState } from "./types.ts";

type Grid = { resolve: (x: number, z: number, r: number, out: { x: number; z: number }) => void };

/** Leave chassis in the world as a remountable wreck; free traffic/parked claims. */
function stashChassis(s: PlayerState, untilMs: number): void {
  const pose = { x: s.ds.x, z: s.ds.z, yaw: s.ds.yaw };
  const kind = s.kind as 1 | 2 | 3;
  const stash = {
    ...pose,
    kind,
    until: performance.now() + untilMs,
    chassisHp: s.chassisHp,
  };
  if (runtime.city && s.worldParkedIndex != null) {
    releaseWorldParked(runtime.city, s.worldParkedIndex, pose);
    sendClaim("p", s.worldParkedIndex, true);
    s.parked = { ...stash, worldIndex: s.worldParkedIndex };
    s.worldParkedIndex = null;
  } else if (s.trafficAgentIndex != null) {
    const idx = s.trafficAgentIndex;
    const a = runtime.traffic?.agents[idx];
    if (a) {
      a.x = pose.x;
      a.z = pose.z;
      a.yaw = pose.yaw;
      a.speed = 0;
      // Visible wreck: not `taken` (that sinks the mesh), AI frozen via wrecked.
      a.taken = false;
      a.wrecked = true;
      a.appearT = 0;
    }
    // Free + wreck pose so peers freeze the same visible chassis.
    sendClaim("t", idx, true, { wreck: true, x: pose.x, z: pose.z, yaw: pose.yaw });
    s.parked = { ...stash, trafficIndex: idx };
    s.trafficAgentIndex = null;
  } else {
    s.parked = stash;
  }
}

export function ejectCrash(
  s: PlayerState,
  grid: Grid | null | undefined,
  severity: number,
  nx: number,
  nz: number,
): void {
  if (s.mode !== "drive") return;
  const yaw = s.ds.yaw;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const phys = PLAYER_PHYSICS[s.kind as 1 | 2 | 3];
  const wasBike = phys.separableRider;
  stashChassis(s, 45_000);
  // Rider separates along impact — bike/scooter leave chassis behind.
  const throwDir = Math.hypot(nx, nz) > 1e-4 ? { x: nx, z: nz } : { x: cos, z: -sin };
  const inv = 1 / (Math.hypot(throwDir.x, throwDir.z) || 1);
  const sep = phys.separableRider ? 1.55 : 1.2;
  s.x = s.ds.x + throwDir.x * inv * sep;
  s.z = s.ds.z + throwDir.z * inv * sep;
  if (grid) {
    grid.resolve(s.x, s.z, PLAYER_RADIUS, resolveOut);
    s.x = resolveOut.x;
    s.z = resolveOut.z;
  }
  const impulse = ejectImpulse(severity, Math.abs(s.ds.speed) || 8);
  const riderBoost = phys.separableRider ? 1.35 : 1;
  s.kb.x = throwDir.x * inv * impulse.force * riderBoost;
  s.kb.z = throwDir.z * inv * impulse.force * riderBoost;
  s.vy = impulse.up * (phys.separableRider ? 1.25 : 1);
  s.y = phys.separableRider ? 0.42 : 0.28;
  s.facing = yaw;
  s.mode = "foot";
  s.kind = 0;
  s.rideWith = null;
  s.speed = 0;
  s.ds.speed = 0;
  s.blinker = 0;
  s.blinkerArmed = false;
  s.stunUntil = performance.now() + 400 + severity * (phys.separableRider ? 720 : 500);
  s.shake = Math.max(s.shake, 0.55 + severity * 0.4);
  driveAuthorityExit({ x: s.x, y: s.y, z: s.z, yaw: s.facing });
  setEngine(0, 0);
  hitCue(1.4);
  crashCue(1.1 + severity * 0.4);
  if (wasBike) toast(severity >= 0.75 ? "Thrown clear — bike still there" : "Thrown clear of the scooter");
}

export function triggerWasted(s: PlayerState): void {
  if (s.wastedUntil > 0) return;
  const now = performance.now();
  if (s.mode === "drive") {
    stashChassis(s, 45_000);
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
  s.stunUntil = now + KHATAM.holdMs;
  s.wastedUntil = now + KHATAM.holdMs;
  setEngine(0, 0);
  wastedCue();
  useGame.setState({ wasted: true });
  live.hp = 0;
}

export function applyCrashHit(
  s: PlayerState,
  grid: Grid | null | undefined,
  sev: number,
  nx: number,
  nz: number,
  speedBefore: number,
  opts: CrashHitOpts = {},
): boolean {
  if (sev < 0.16 || s.mode !== "drive") return false;
  const kind = s.kind as 1 | 2 | 3;
  const phys = PLAYER_PHYSICS[kind];
  const otherMass = opts.otherMass ?? 1200;
  const closing = opts.closing ?? Math.abs(speedBefore);

  const dmg = crashDamage(sev);
  if (dmg > 0) s.hp = Math.max(0, s.hp - dmg);
  s.chassisHp = Math.max(0, s.chassisHp - chassisDamage(sev, phys.durability));
  s.shake = Math.min(1.15, s.shake + impactShake(sev, speedBefore));
  s.ds.roll += tumbleRoll(sev, Math.random()) * (phys.separableRider ? 1.4 : 1);

  if (opts.speedAfter != null) {
    s.ds.speed = opts.speedAfter;
    s.ds.yaw += opts.yawKick ?? 0;
  } else if (sev >= 0.42) {
    const b = naturalBounce(speedBefore, s.ds.yaw, nx, nz, sev);
    s.ds.speed = b.speed;
    s.ds.yaw += b.yawKick;
  } else {
    s.ds.speed = softSpeedScrub(speedBefore, sev);
  }

  crashCue(0.45 + sev * 0.8);
  const separate =
    shouldSeparateRider(phys, otherMass, sev, closing) ||
    shouldEjectCabinBody(phys, otherMass, sev);
  reportCrash(s.ds.x, s.ds.z, sev, separate && phys.separableRider);
  const fatal = isFatalCrash(sev, speedBefore) || s.hp <= 0;
  if (separate) {
    ejectCrash(s, grid, phys.separableRider ? sev : sev * 0.75, nx, nz);
    if (fatal) triggerWasted(s);
    return true;
  }
  if (fatal) {
    triggerWasted(s);
    return true;
  }
  return false;
}
