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
import { useNet, type Peer } from "@/net/store";
import { PLAYER_PHYSICS } from "@/vehicles/physics-props";
import { SPECS, type VehicleKind } from "@/vehicles/specs";
import type { CityData } from "@/world/types";
import { PLAYER_RADIUS, resolveOut } from "./constants.ts";
import { findNearestRide } from "./find-nearest-ride.ts";
import { freeSeat } from "./free-seat.ts";
import type { PlayerCmds, PlayerState } from "./types.ts";

type Grid = { resolve: (x: number, z: number, r: number, out: { x: number; z: number }) => void };

function enterDrive(
  s: PlayerState,
  kind: 1 | 2 | 3,
  x: number,
  z: number,
  yaw: number,
  worldIndex: number | null,
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
  s.chassisHp = PLAYER_PHYSICS[kind].durability;
  unlockAudio();
  setEngine(kind, 0);
  driveAuthorityEnter(kind, { x, z, yaw });
}

function leaveChassis(s: PlayerState, grid: Grid | null | undefined, city: CityData): void {
  const pose = { x: s.ds.x, z: s.ds.z, yaw: s.ds.yaw };
  if (s.worldParkedIndex != null) {
    releaseWorldParked(city, s.worldParkedIndex, pose);
    s.worldParkedIndex = null;
  } else {
    s.parked = {
      x: pose.x,
      z: pose.z,
      yaw: pose.yaw,
      kind: s.kind as 1 | 2 | 3,
      until: performance.now() + 120_000,
    };
  }
  const spec = SPECS[s.kind as 1 | 2 | 3];
  const cos = Math.cos(s.ds.yaw);
  const sin = Math.sin(s.ds.yaw);
  const off = spec.width / 2 + 0.7;
  s.x = s.ds.x + cos * off;
  s.z = s.ds.z - sin * off;
  s.facing = s.ds.yaw;
  if (grid) {
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
    s.x = bx + Math.cos(yaw) * 2.1;
    s.z = bz - Math.sin(yaw) * 2.1;
    s.facing = yaw;
  }
  if (grid) {
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
    s.parked = null;
    return false;
  }
  if ((p.x - s.x) ** 2 + (p.z - s.z) ** 2 > 18 * 18) return false;
  enterDrive(s, p.kind, p.x, p.z, p.yaw, p.worldIndex ?? null);
  if (p.worldIndex != null) claimWorldParked(city, p.worldIndex);
  toast(`Back in your ${SPECS[p.kind].name}`);
  return true;
}

function enterNearbyVehicle(s: PlayerState, city: CityData): boolean {
  const agents = runtime.traffic?.agents ?? null;
  const hit = findNearestEnterable(s.x, s.z, city, agents);
  if (!hit) return false;

  if (hit.source === "parked") {
    claimWorldParked(city, hit.index);
    enterDrive(s, hit.kind, hit.x, hit.z, hit.yaw, hit.index);
    toast(`${SPECS[hit.kind].name} · drive freely`);
    grantMission("ride");
    return true;
  }

  const agent = agents?.[hit.index];
  if (!agent || agent.taken) return false;
  agent.taken = true;
  agent.speed = 0;
  enterDrive(s, hit.kind, hit.x, hit.z, hit.yaw, null);
  const label =
    hit.trafficKind === 3 ? "Bus" : hit.trafficKind === 4 ? "Truck" : SPECS[hit.kind].name;
  toast(`${label} · drive freely`);
  grantMission("ride");
  return true;
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
      toast(`Riding with ${ride.name}`);
      grantMission("ride");
      return;
    }
  }
  if (remountParked(s, city)) return;
  if (!enterNearbyVehicle(s, city)) {
    toast("No vehicle nearby · walk to the scooter/auto/cab by spawn");
  }
}

/** HUD / prompt helper — nearest hop-in peer. */
export function nearestRidePeer(s: PlayerState, peers: Map<string, Peer>): Peer | null {
  return findNearestRide(s.x, s.z, peers);
}

export type VehicleCmdBag = Pick<PlayerCmds, "vehicle">;
