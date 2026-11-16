/**
 * Universal vehicle controller — attach/detach to any registry EntityId.
 *
 * Does not spawn meshes. It:
 *  1. Claims the persistent entity
 *  2. Mounts Rapier (drive archetype) at the entity pose
 *  3. Drives PlayerState.kind as archetype for net/HUD
 *  4. On detach, writes pose back and releases claim
 */
import { setEngine, unlockAudio } from "@/game/audio";
import type { PlayerState } from "@/game/player/types";
import { runtime } from "@/game/runtime";
import { driveAuthorityEnter, driveAuthorityExit } from "@/game/sim/drive-authority";
import { claimWorldParked, releaseWorldParked } from "@/game/world-vehicles";
import { sendClaim } from "@/net/store";
import type { CityData } from "@/world/types.ts";
import type { DriveCatalogEntry } from "./drive-catalog.ts";
import { PLAYER_PHYSICS } from "./physics-props.ts";
import type { Agent } from "./traffic-kinds.ts";
import {
  parkedId,
  trafficId,
  vehicleRegistry,
  type EntityId,
  type VehicleEntity,
} from "./vehicle-registry.ts";

const LOCAL = "local";

export type AttachResult = {
  ok: boolean;
  entity: VehicleEntity | null;
  catalog: DriveCatalogEntry | null;
  reason?: string;
};

/**
 * Bind player drive mode to an existing chassis. Never allocates a new entity.
 */
export function attachUniversalDrive(
  s: PlayerState,
  id: EntityId,
  opts?: { chassisHp?: number },
): AttachResult {
  const entity = vehicleRegistry.get(id);
  if (!entity) return { ok: false, entity: null, catalog: null, reason: "missing" };
  if (!vehicleRegistry.claim(id, LOCAL)) {
    return { ok: false, entity, catalog: entity.catalog, reason: "claimed" };
  }

  const { catalog, archetype } = entity;
  const parsed = vehicleRegistry.parse(id);

  s.ds.x = entity.x;
  s.ds.z = entity.z;
  s.ds.yaw = entity.yaw;
  s.ds.speed = 0;
  s.ds.steer = 0;
  s.ds.roll = 0;
  s.mode = "drive";
  s.kind = archetype;
  s.lastKind = archetype;
  s.seat = 0;
  s.emote = 0;
  s.parked = null;

  if (parsed.source === "p") {
    s.worldParkedIndex = parsed.index;
    s.trafficAgentIndex = null;
    const city = runtime.city;
    if (city) claimWorldParked(city, parsed.index);
    sendClaim("p", parsed.index, false);
  } else {
    s.trafficAgentIndex = parsed.index;
    s.worldParkedIndex = null;
    sendClaim("t", parsed.index, false);
  }

  const full = PLAYER_PHYSICS[archetype].durability;
  s.chassisHp =
    opts?.chassisHp != null
      ? Math.max(0, Math.min(full, opts.chassisHp))
      : entity.chassisHp > 1
        ? Math.min(full, entity.chassisHp)
        : full;

  unlockAudio();
  setEngine(archetype, 0);
  driveAuthorityEnter(archetype, { x: entity.x, z: entity.z, yaw: entity.yaw });

  return { ok: true, entity, catalog };
}

/** Attach helpers for existing enter paths. */
export function attachParked(
  s: PlayerState,
  cityIndex: number,
  chassisHp?: number,
): AttachResult {
  return attachUniversalDrive(s, parkedId(cityIndex), { chassisHp });
}

export function attachTraffic(
  s: PlayerState,
  agentIndex: number,
  agent: Agent | null | undefined,
  chassisHp?: number,
): AttachResult {
  if (agent) {
    vehicleRegistry.writePose(trafficId(agentIndex), {
      x: agent.x,
      z: agent.z,
      yaw: agent.yaw,
      speed: 0,
    });
    agent.taken = true;
    agent.wrecked = false;
    agent.hasPillion = false;
    agent.speed = 0;
    agent.appearT = 0;
  }
  return attachUniversalDrive(s, trafficId(agentIndex), { chassisHp });
}

/**
 * Detach controller — persist pose on the same EntityId, show world mesh again.
 */
export function detachUniversalDrive(
  s: PlayerState,
  city: CityData,
  agents: readonly Agent[] | null | undefined,
): EntityId | null {
  let id: EntityId | null = null;
  if (s.worldParkedIndex != null) id = parkedId(s.worldParkedIndex);
  else if (s.trafficAgentIndex != null) id = trafficId(s.trafficAgentIndex);

  const pose = { x: s.ds.x, z: s.ds.z, yaw: s.ds.yaw, speed: 0, chassisHp: s.chassisHp };
  if (id) {
    vehicleRegistry.writePose(id, pose);
    vehicleRegistry.release(id, LOCAL);
  }

  if (s.worldParkedIndex != null) {
    releaseWorldParked(city, s.worldParkedIndex, pose);
    sendClaim("p", s.worldParkedIndex, true);
  } else if (s.trafficAgentIndex != null) {
    const a = agents?.[s.trafficAgentIndex];
    if (a) {
      a.x = pose.x;
      a.z = pose.z;
      a.yaw = pose.yaw;
      a.speed = 0;
      a.taken = false;
      a.wrecked = false;
    }
    sendClaim("t", s.trafficAgentIndex, true);
  }

  driveAuthorityExit({ x: s.x, y: s.y, z: s.z, yaw: s.facing });
  setEngine(0, 0);
  return id;
}

/** Keep registry pose fresh while local player drives (call from drive tick). */
export function syncDrivingEntity(s: PlayerState): void {
  if (s.mode !== "drive") return;
  let id: EntityId | null = null;
  if (s.worldParkedIndex != null) id = parkedId(s.worldParkedIndex);
  else if (s.trafficAgentIndex != null) id = trafficId(s.trafficAgentIndex);
  if (!id) return;
  vehicleRegistry.writePose(id, {
    x: s.ds.x,
    z: s.ds.z,
    yaw: s.ds.yaw,
    speed: s.ds.speed,
    chassisHp: s.chassisHp,
  });
}
