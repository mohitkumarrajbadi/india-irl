import type { DestructibleSim } from "./destructible-sim";
import type { StaticGrid } from "../lib/spatial";
import type { Obstacle, TrafficSim } from "../vehicles/traffic";
import type { AnimalSim } from "../world/animals";
import type { PedestrianSim } from "../world/pedestrians";
import type { PoliceSim } from "../world/police";
import type { CityData } from "../world/types";
import type { VehicleKind } from "../vehicles/specs";

/**
 * Mutable per-frame state. React never reads this directly. The frame loop
 * writes it, and HUD widgets sample it a few times a second.
 */
export const live = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  speed: 0,
  vehicle: 0 as VehicleKind,
  /** Seat index in the vehicle, 0 is the driver. */
  seat: 0,
  /** Driver's player id when riding as a passenger. */
  rideWith: null as string | null,
  emote: 0,
  hour: 12,
  throttle: 0,
  /** Soft PvP health 0–100. */
  hp: 100,
  /** Turn indicators: -1 left, 0 off, 1 right. */
  blinker: 0 as -1 | 0 | 1,
};

/** Incoming fight impulses applied next frame by PlayerController. */
export const pendingHits: { from: string; kind: 0 | 1; at: number }[] = [];

export const runtime = {
  city: null as CityData | null,
  grid: null as StaticGrid | null,
  traffic: null as TrafficSim | null,
  peds: null as PedestrianSim | null,
  animals: null as AnimalSim | null,
  police: null as PoliceSim | null,
  destructibles: null as DestructibleSim | null,
};

/** Things traffic should avoid, rebuilt each frame. */
export const obstacles: Obstacle[] = [];

/** Chat bubble for the local player, picked up by the avatar on the next frame. */
export const selfSay = { text: "", until: 0, seq: 0 };
