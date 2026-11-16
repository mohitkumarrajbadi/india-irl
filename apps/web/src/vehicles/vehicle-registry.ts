/**
 * Persistent vehicle entity pool — fixed slots, no spawn-on-interact.
 *
 * EntityId format:
 *   p:<city.parked index>  — world curb vehicles
 *   t:<traffic agent index> — ambient fleet (slot index is stable for the session)
 *
 * Enter/exit never allocates a new id. Claim is exclusive; pose writes go back
 * into the same slot so peers + AI see one chassis.
 */
import type { DriveArchetype, DriveCatalogEntry } from "./drive-catalog.ts";
import { parkedDrive, trafficDrive } from "./drive-catalog.ts";
import type { TrafficKind } from "./traffic-kinds.ts";
import type { CityData } from "../world/types.ts";
import type { Agent } from "./traffic-kinds.ts";

export type EntityId = `p:${number}` | `t:${number}`;

export type VehicleEntity = {
  id: EntityId;
  catalog: DriveCatalogEntry;
  archetype: DriveArchetype;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  /** Peer id or "local" while claimed; null = free. */
  claimedBy: string | null;
  /** Structural HP for remount continuity. */
  chassisHp: number;
  /** Traffic AI frozen while player/peer drives. */
  aiPaused: boolean;
};

function parseId(id: EntityId): { source: "p" | "t"; index: number } {
  const [source, raw] = id.split(":") as ["p" | "t", string];
  return { source, index: Number(raw) };
}

export function parkedId(index: number): EntityId {
  return `p:${index}`;
}

export function trafficId(index: number): EntityId {
  return `t:${index}`;
}

export class VehicleRegistry {
  readonly byId = new Map<EntityId, VehicleEntity>();

  clear(): void {
    this.byId.clear();
  }

  /** Register curb slots once per city load. */
  registerParked(city: CityData): void {
    for (let i = 0; i < city.parked.length; i += 1) {
      const p = city.parked[i]!;
      const catalog = parkedDrive((p.kind ?? 0) as 0 | 1 | 2);
      const id = parkedId(i);
      this.byId.set(id, {
        id,
        catalog,
        archetype: catalog.archetype,
        x: p.x,
        z: p.z,
        yaw: p.rot,
        speed: 0,
        claimedBy: null,
        chassisHp: 1,
        aiPaused: false,
      });
    }
  }

  /** Register ambient traffic slots once per TrafficSim construction. */
  registerTraffic(agents: readonly Agent[]): void {
    for (let i = 0; i < agents.length; i += 1) {
      const a = agents[i]!;
      const catalog = trafficDrive(a.kind as TrafficKind);
      const id = trafficId(i);
      this.byId.set(id, {
        id,
        catalog,
        archetype: catalog.archetype,
        x: a.x,
        z: a.z,
        yaw: a.yaw,
        speed: a.speed,
        claimedBy: null,
        chassisHp: 1,
        aiPaused: a.taken || a.wrecked,
      });
    }
  }

  get(id: EntityId): VehicleEntity | null {
    return this.byId.get(id) ?? null;
  }

  /** Exclusive claim — returns false if already owned by someone else. */
  claim(id: EntityId, owner: string): boolean {
    const e = this.byId.get(id);
    if (!e) return false;
    if (e.claimedBy && e.claimedBy !== owner) return false;
    e.claimedBy = owner;
    e.aiPaused = true;
    e.speed = 0;
    return true;
  }

  release(id: EntityId, owner: string): boolean {
    const e = this.byId.get(id);
    if (!e) return false;
    if (e.claimedBy && e.claimedBy !== owner) return false;
    e.claimedBy = null;
    e.aiPaused = false;
    return true;
  }

  /** Write authority pose back into the persistent slot (never reallocates). */
  writePose(
    id: EntityId,
    pose: { x: number; z: number; yaw: number; speed?: number; chassisHp?: number },
  ): void {
    const e = this.byId.get(id);
    if (!e) return;
    e.x = pose.x;
    e.z = pose.z;
    e.yaw = pose.yaw;
    if (pose.speed != null) e.speed = pose.speed;
    if (pose.chassisHp != null) e.chassisHp = pose.chassisHp;
  }

  /** Pull live traffic agent pose into registry (unclaimed only). */
  syncFromTrafficAgent(index: number, a: Agent): void {
    const id = trafficId(index);
    const e = this.byId.get(id);
    if (!e || e.claimedBy) return;
    e.x = a.x;
    e.z = a.z;
    e.yaw = a.yaw;
    e.speed = a.speed;
    e.aiPaused = a.taken || a.wrecked;
  }

  /** Apply registry pose onto a traffic agent after player exit. */
  applyToTrafficAgent(index: number, a: Agent): void {
    const e = this.byId.get(trafficId(index));
    if (!e) return;
    a.x = e.x;
    a.z = e.z;
    a.yaw = e.yaw;
    a.speed = e.speed;
    a.taken = !!e.claimedBy;
  }

  nearestFree(
    x: number,
    z: number,
    maxR = 18,
  ): VehicleEntity | null {
    const maxR2 = maxR * maxR;
    let best: VehicleEntity | null = null;
    let bestD = maxR2;
    for (const e of this.byId.values()) {
      if (e.claimedBy) continue;
      const d = (e.x - x) ** 2 + (e.z - z) ** 2;
      if (d >= bestD) continue;
      bestD = d;
      best = e;
    }
    return best;
  }

  parse(id: EntityId) {
    return parseId(id);
  }
}

/** Session singleton — reset on city remount. */
export const vehicleRegistry = new VehicleRegistry();
