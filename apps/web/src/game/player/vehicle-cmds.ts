/** Enter / exit parked + traffic vehicles + peer rides (no summon). */
import { setEngine, unlockAudio } from "@/game/audio";
import { findNearestEnterable } from "@/game/enterable-vehicles";
import { runtime } from "@/game/runtime";
import { driveAuthorityEnter, driveAuthorityExit } from "@/game/sim/drive-authority";
import { grantMission, toast } from "@/game/store";
import {
  claimWorldParked,
  releaseWorldParked,
} from "@/game/world-vehicles";
import { sendClaim, useNet, type Peer } from "@/net/store";
import { PLAYER_PHYSICS } from "@/vehicles/physics-props";
import { SPECS, type VehicleKind } from "@/vehicles/specs";
import type { CityData } from "@/world/types";
import { PLAYER_RADIUS, resolveOut } from "./constants.ts";
import { exitFootPose } from "./exit-pose.ts";
import { findNearestRide } from "./find-nearest-ride.ts";
import { freeSeat } from "./free-seat.ts";
import type { PlayerCmds, PlayerState } from "./types.ts";

type Grid = { resolve: (x: number, z: number, r: number, out: { x: number; z: number }) => void };

const REMOUNT_MS = 120_000;
/** Remount only wins over a closer curb/traffic vehicle inside this radius. */
const REMOUNT_PRIORITY_M = 4.5;

function enterDrive(
  s: PlayerState,
  kind: 1 | 2 | 3,
  x: number,
  z: number,
  yaw: number,
  worldIndex: number | null,
  chassisHp?: number,
): void {
  s.ds.x = x;
  s.ds.z = z;
  s.ds.yaw = yaw;
  s.ds.speed = 0;
  s.ds.steer = 0;
  s.ds.roll = 0;
  s.mode = "drive";
  s.kind = kind;
  s.lastKind = kind;
  s.seat = 0;
  s.emote = 0;
  s.parked = null;
  s.worldParkedIndex = worldIndex;
  s.trafficAgentIndex = null;
  const full = PLAYER_PHYSICS[kind].durability;
  s.chassisHp = chassisHp != null ? Math.max(0, Math.min(full, chassisHp)) : full;
  unlockAudio();
  setEngine(kind, 0);
  driveAuthorityEnter(kind, { x, z, yaw });
}

function leaveChassis(s: PlayerState, grid: Grid | null | undefined, city: CityData): void {
  const kind = s.kind as 1 | 2 | 3;
  const pose = { x: s.ds.x, z: s.ds.z, yaw: s.ds.yaw };
  const stash = {
    x: pose.x,
    z: pose.z,
    yaw: pose.yaw,
    kind,
    until: performance.now() + REMOUNT_MS,
    chassisHp: s.chassisHp,
  };
  if (s.worldParkedIndex != null) {
    releaseWorldParked(city, s.worldParkedIndex, pose);
    sendClaim("p", s.worldParkedIndex, true);
    s.parked = { ...stash, worldIndex: s.worldParkedIndex };
    s.worldParkedIndex = null;
  } else if (s.trafficAgentIndex != null) {
    const a = runtime.traffic?.agents[s.trafficAgentIndex];
    if (a) {
      a.x = pose.x;
      a.z = pose.z;
      a.yaw = pose.yaw;
      a.speed = 0;
      a.taken = false;
      a.wrecked = false;
    }
    sendClaim("t", s.trafficAgentIndex, true);
    s.parked = { ...stash, trafficIndex: s.trafficAgentIndex };
    s.trafficAgentIndex = null;
  } else {
    s.parked = stash;
  }
  const foot = exitFootPose(s.ds, SPECS[kind].width, grid);
  s.x = foot.x;
  s.z = foot.z;
  s.facing = foot.facing;
  s.mode = "foot";
  s.kind = 0;
  s.rideWith = null;
  s.speed = 0;
  s.y = 0;
  s.vy = 0;
  driveAuthorityExit({ x: s.x, y: s.y, z: s.z, yaw: s.facing });
  setEngine(0, 0);
}

export function dismount(s: PlayerState, grid: Grid | null | undefined, city: CityData): void {
  if (s.mode === "drive") {
    leaveChassis(s, grid, city);
    return;
  }
  if (s.mode === "passenger") {
    const peer = s.rideWith ? useNet.getState().peerMap.get(s.rideWith) : undefined;
    const bx = peer ? peer.rx : s.x;
    const bz = peer ? peer.rz : s.z;
    const yaw = peer ? peer.ryaw : s.facing;
    const kind = (s.kind === 1 || s.kind === 2 || s.kind === 3 ? s.kind : 3) as 1 | 2 | 3;
    const foot = exitFootPose({ x: bx, z: bz, yaw }, SPECS[kind].width, grid);
    s.x = foot.x;
    s.z = foot.z;
    s.facing = foot.facing;
  } else if (grid) {
    grid.resolve(s.x, s.z, PLAYER_RADIUS, resolveOut);
    s.x = resolveOut.x;
    s.z = resolveOut.z;
  }
  s.mode = "foot";
  s.kind = 0;
  s.rideWith = null;
  s.speed = 0;
  s.y = 0;
  s.vy = 0;
  driveAuthorityExit({ x: s.x, y: s.y, z: s.z, yaw: s.facing });
  setEngine(0, 0);
}

function reclaimTraffic(idx: number, pose: { x: number; z: number; yaw: number }): boolean {
  const a = runtime.traffic?.agents[idx];
  if (!a) return false;
  a.x = pose.x;
  a.z = pose.z;
  a.yaw = pose.yaw;
  a.speed = 0;
  a.taken = true;
  a.wrecked = false;
  a.appearT = 0;
  sendClaim("t", idx, false);
  return true;
}

function remountParked(s: PlayerState, city: CityData): boolean {
  const p = s.parked;
  if (!p || performance.now() > p.until) {
    if (p?.trafficIndex != null) {
      const a = runtime.traffic?.agents[p.trafficIndex];
      if (a?.wrecked) {
        a.wrecked = false;
        a.taken = false;
        a.speed = 0;
      }
    } else if (p && p.worldIndex == null) {
      releaseNearbyTakenTraffic(p.x, p.z);
    }
    s.parked = null;
    return false;
  }
  if ((p.x - s.x) ** 2 + (p.z - s.z) ** 2 > 18 * 18) return false;

  // Must bind to a world/traffic identity — never orphan-summon.
  if (p.worldIndex != null) {
    enterDrive(s, p.kind, p.x, p.z, p.yaw, p.worldIndex, p.chassisHp);
    claimWorldParked(city, p.worldIndex);
    sendClaim("p", p.worldIndex, false);
    toast(`Back in your ${SPECS[p.kind].name}`);
    return true;
  }

  const idx =
    p.trafficIndex != null && runtime.traffic?.agents[p.trafficIndex]
      ? p.trafficIndex
      : findNearbyWreckedTraffic(p.x, p.z);
  if (idx == null) return false;
  if (!reclaimTraffic(idx, p)) return false;
  enterDrive(s, p.kind, p.x, p.z, p.yaw, null, p.chassisHp);
  s.trafficAgentIndex = idx;
  toast(`Back in your ${SPECS[p.kind].name}`);
  return true;
}

function findNearbyWreckedTraffic(x: number, z: number): number | null {
  const agents = runtime.traffic?.agents;
  if (!agents) return null;
  let best: number | null = null;
  let bestD = 5 * 5;
  for (let i = 0; i < agents.length; i += 1) {
    const a = agents[i]!;
    if (!a.wrecked) continue;
    const d = (a.x - x) ** 2 + (a.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function releaseNearbyTakenTraffic(x: number, z: number): void {
  const agents = runtime.traffic?.agents;
  if (!agents) return;
  let best: number | null = null;
  let bestD = 4 * 4;
  for (let i = 0; i < agents.length; i += 1) {
    const a = agents[i]!;
    if (!a.taken && !a.wrecked) continue;
    const d = (a.x - x) ** 2 + (a.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best == null) return;
  const a = agents[best]!;
  a.taken = false;
  a.wrecked = false;
  a.speed = 0;
  sendClaim("t", best, true);
}

function enterNearbyVehicle(s: PlayerState, city: CityData): boolean {
  const agents = runtime.traffic?.agents ?? null;
  const hit = findNearestEnterable(s.x, s.z, city, agents);
  if (!hit) return false;

  if (hit.source === "parked") {
    claimWorldParked(city, hit.index);
    sendClaim("p", hit.index, false);
    enterDrive(s, hit.kind, hit.x, hit.z, hit.yaw, hit.index);
    toast(`${SPECS[hit.kind].name} · drive freely`);
    grantMission("ride");
    return true;
  }

  const agent = agents?.[hit.index];
  if (!agent || agent.taken) return false;
  agent.taken = true;
  agent.wrecked = false;
  agent.speed = 0;
  agent.appearT = 0;
  enterDrive(s, hit.kind, hit.x, hit.z, hit.yaw, null);
  s.trafficAgentIndex = hit.index;
  sendClaim("t", hit.index, false);
  const label =
    hit.trafficKind === 3 ? "Bus" : hit.trafficKind === 4 ? "Truck" : SPECS[hit.kind].name;
  toast(`${label} · drive freely`);
  grantMission("ride");
  return true;
}

function stashDist2(s: PlayerState): number {
  const p = s.parked;
  if (!p || performance.now() > p.until) return Infinity;
  return (p.x - s.x) ** 2 + (p.z - s.z) ** 2;
}

export function vehicleAction(
  s: PlayerState,
  grid: Grid | null | undefined,
  city: CityData,
): void {
  if (s.wastedUntil > 0) return;
  if (s.mode !== "foot") {
    dismount(s, grid, city);
    return;
  }
  const { peerMap } = useNet.getState();
  const ride = findNearestRide(s.x, s.z, peerMap);
  if (ride) {
    const idx = freeSeat(ride, peerMap);
    if (idx >= 0) {
      s.mode = "passenger";
      s.rideWith = ride.id;
      s.kind = ride.veh as VehicleKind;
      s.seat = idx;
      s.emote = 0;
      s.passengerGrace = 450;
      toast(`Riding with ${ride.name}`);
      grantMission("ride");
      return;
    }
  }

  // Prefer the closest physical vehicle in the world over remounting a distant stash.
  const agents = runtime.traffic?.agents ?? null;
  const hit = findNearestEnterable(s.x, s.z, city, agents);
  const hitD2 = hit ? (hit.x - s.x) ** 2 + (hit.z - s.z) ** 2 : Infinity;
  const remD2 = stashDist2(s);
  const remPri2 = REMOUNT_PRIORITY_M * REMOUNT_PRIORITY_M;

  if (remD2 < remPri2 && remD2 <= hitD2 + 1e-6) {
    if (remountParked(s, city)) return;
  }
  if (hit && enterNearbyVehicle(s, city)) return;
  if (remD2 < 18 * 18 && remountParked(s, city)) return;

  toast("No vehicle nearby · walk to the scooter/auto/cab by spawn");
}

/** HUD / prompt helper — nearest hop-in peer. */
export function nearestRidePeer(s: PlayerState, peers: Map<string, Peer>): Peer | null {
  return findNearestRide(s.x, s.z, peers);
}

export type VehicleCmdBag = Pick<PlayerCmds, "vehicle">;
