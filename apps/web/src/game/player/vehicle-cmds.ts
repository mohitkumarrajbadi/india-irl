/** Enter / exit parked + traffic vehicles + peer rides (no summon). */
import { setEngine } from "@/game/audio";
import { findNearestEnterable, trafficKindLabel } from "@/game/enterable-vehicles";
import { runtime } from "@/game/runtime";
import { driveAuthorityExit } from "@/game/sim/drive-authority";
import { grantMission, toast } from "@/game/store";
import { releaseWorldParked } from "@/game/world-vehicles";
import { sendClaim, useNet, type Peer } from "@/net/store";
import { SPECS, type VehicleKind } from "@/vehicles/specs";
import { ejectTrafficPillion } from "@/vehicles/traffic-tumble";
import {
  attachParked,
  attachTraffic,
  attachUniversalDrive,
} from "@/vehicles/universal-controller";
import { parkedId, trafficId, vehicleRegistry } from "@/vehicles/vehicle-registry";
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
const LOCAL = "local";

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
    const id = parkedId(s.worldParkedIndex);
    vehicleRegistry.writePose(id, { ...pose, speed: 0, chassisHp: s.chassisHp });
    vehicleRegistry.release(id, LOCAL);
    releaseWorldParked(city, s.worldParkedIndex, pose);
    sendClaim("p", s.worldParkedIndex, true);
    s.parked = { ...stash, worldIndex: s.worldParkedIndex };
    s.worldParkedIndex = null;
  } else if (s.trafficAgentIndex != null) {
    const id = trafficId(s.trafficAgentIndex);
    vehicleRegistry.writePose(id, { ...pose, speed: 0, chassisHp: s.chassisHp });
    vehicleRegistry.release(id, LOCAL);
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

  if (p.worldIndex != null) {
    vehicleRegistry.writePose(parkedId(p.worldIndex), {
      x: p.x,
      z: p.z,
      yaw: p.yaw,
      chassisHp: p.chassisHp,
    });
    const r = attachParked(s, p.worldIndex, p.chassisHp);
    if (!r.ok) return false;
    toast(`Back in your ${r.catalog?.name ?? SPECS[p.kind].name}`);
    return true;
  }

  const idx =
    p.trafficIndex != null && runtime.traffic?.agents[p.trafficIndex]
      ? p.trafficIndex
      : findNearbyWreckedTraffic(p.x, p.z);
  if (idx == null) return false;
  const agent = runtime.traffic?.agents[idx];
  vehicleRegistry.writePose(trafficId(idx), {
    x: p.x,
    z: p.z,
    yaw: p.yaw,
    chassisHp: p.chassisHp,
  });
  const r = attachTraffic(s, idx, agent, p.chassisHp);
  if (!r.ok) return false;
  toast(`Back in your ${r.catalog?.name ?? SPECS[p.kind].name}`);
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
  vehicleRegistry.release(trafficId(best), LOCAL);
  sendClaim("t", best, true);
}

function enterNearbyVehicle(s: PlayerState, city: CityData): boolean {
  const agents = runtime.traffic?.agents ?? null;
  const hit = findNearestEnterable(s.x, s.z, city, agents);
  if (!hit) return false;

  if (hit.source === "parked") {
    vehicleRegistry.writePose(parkedId(hit.index), {
      x: hit.x,
      z: hit.z,
      yaw: hit.yaw,
    });
    const r = attachParked(s, hit.index);
    if (!r.ok) {
      toast(r.reason === "claimed" ? "Someone else is in that vehicle" : "Can't enter");
      return false;
    }
    toast(`${r.catalog?.name ?? "Vehicle"} · drive freely`);
    grantMission("ride");
    return true;
  }

  const agent = agents?.[hit.index];
  if (!agent || agent.taken) return false;
  const stealing = Math.abs(agent.speed) > 2.5 || agent.hasPillion;
  if (agent.hasPillion) ejectTrafficPillion(agent);
  const r = attachTraffic(s, hit.index, agent);
  if (!r.ok) {
    toast(r.reason === "claimed" ? "Someone else is in that vehicle" : "Can't enter");
    return false;
  }
  const label = trafficKindLabel(hit.trafficKind);
  toast(stealing ? `${label} · stolen` : `${label} · drive freely`);
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

  // Registry fallback — any free chassis in reach
  const nearest = vehicleRegistry.nearestFree(s.x, s.z, 18);
  if (nearest) {
    const r = attachUniversalDrive(s, nearest.id);
    if (r.ok) {
      toast(`${r.catalog?.name ?? "Vehicle"} · drive freely`);
      grantMission("ride");
      return;
    }
  }

  toast("No vehicle nearby · walk up to any car, bike, or auto");
}

/** HUD / prompt helper — nearest hop-in peer. */
export function nearestRidePeer(s: PlayerState, peers: Map<string, Peer>): Peer | null {
  return findNearestRide(s.x, s.z, peers);
}

export type VehicleCmdBag = Pick<PlayerCmds, "vehicle">;
