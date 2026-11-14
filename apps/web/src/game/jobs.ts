/**
 * Short activity loops: Delivery dash, Cab ferry, Chai runner.
 * Uses city meet plazas as pickup / drop points.
 */
import { create } from "zustand";
import type { CityData } from "@/world/types";

export type JobKind = "delivery" | "ferry" | "chai";

export type JobState = {
  kind: JobKind | null;
  /** carry = have package/chai; drop = headed to drop-off */
  stage: "idle" | "pickup" | "carry" | "drop";
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  startedAt: number;
  deadline: number;
  /** Ferry: waiting for a passenger to hop in */
  needPassenger: boolean;
};

const REACH = 9;
const REACH2 = REACH * REACH;

const idle: JobState = {
  kind: null,
  stage: "idle",
  fromId: "",
  toId: "",
  fromLabel: "",
  toLabel: "",
  fromX: 0,
  fromZ: 0,
  toX: 0,
  toZ: 0,
  startedAt: 0,
  deadline: 0,
  needPassenger: false,
};

function pickTwoMeets(city: CityData): {
  from: CityData["meets"][number];
  to: CityData["meets"][number];
} | null {
  const meets = city.meets;
  if (meets.length < 2) return null;
  const a = Math.floor(Math.random() * meets.length);
  let b = Math.floor(Math.random() * (meets.length - 1));
  if (b >= a) b += 1;
  return { from: meets[a], to: meets[b] };
}

function nearestMeet(city: CityData, x: number, z: number): CityData["meets"][number] | null {
  let best: CityData["meets"][number] | null = null;
  let bd = REACH2;
  for (const m of city.meets) {
    const d = (m.x - x) ** 2 + (m.z - z) ** 2;
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

export const useJob = create<JobState>(() => ({ ...idle }));

export function clearJob(): void {
  useJob.setState({ ...idle });
}

export function startDelivery(city: CityData, x: number, z: number): string | null {
  const pair = pickTwoMeets(city);
  if (!pair) return "Need two meet spots in this city";
  // Prefer starting from nearest meet if you're already there.
  const near = nearestMeet(city, x, z);
  const from = near ?? pair.from;
  const to = from.spec.id === pair.to.spec.id ? pair.from : pair.to;
  if (from.spec.id === to.spec.id) return "Find another plaza to start a dash";
  const now = performance.now();
  useJob.setState({
    kind: "delivery",
    stage: "pickup",
    fromId: from.spec.id,
    toId: to.spec.id,
    fromLabel: from.spec.label,
    toLabel: to.spec.label,
    fromX: from.x,
    fromZ: from.z,
    toX: to.x,
    toZ: to.z,
    startedAt: now,
    deadline: now + 110_000,
    needPassenger: false,
  });
  return null;
}

export function startChai(city: CityData, x: number, z: number): string | null {
  const near = nearestMeet(city, x, z);
  const pair = pickTwoMeets(city);
  if (!pair) return "Need two meet spots";
  const from = near ?? pair.from;
  let to = pair.to;
  if (to.spec.id === from.spec.id) to = pair.from;
  if (to.spec.id === from.spec.id) return "Find another plaza for chai run";
  const now = performance.now();
  useJob.setState({
    kind: "chai",
    stage: near ? "carry" : "pickup",
    fromId: from.spec.id,
    toId: to.spec.id,
    fromLabel: from.spec.label,
    toLabel: to.spec.label,
    fromX: from.x,
    fromZ: from.z,
    toX: to.x,
    toZ: to.z,
    startedAt: now,
    deadline: now + 100_000,
    needPassenger: false,
  });
  return null;
}

export function startFerry(city: CityData, x: number, z: number): string | null {
  const pair = pickTwoMeets(city);
  if (!pair) return "Need meet spots";
  const near = nearestMeet(city, x, z);
  const to = near ?? pair.to;
  const now = performance.now();
  useJob.setState({
    kind: "ferry",
    stage: "carry",
    fromId: "",
    toId: to.spec.id,
    fromLabel: "Pickup",
    toLabel: to.spec.label,
    fromX: x,
    fromZ: z,
    toX: to.x,
    toZ: to.z,
    startedAt: now,
    deadline: now + 140_000,
    needPassenger: true,
  });
  return null;
}

export function jobReward(kind: JobKind): number {
  if (kind === "delivery") return 32;
  if (kind === "ferry") return 40;
  return 28;
}

export function jobTitle(kind: JobKind): string {
  if (kind === "delivery") return "Delivery dash";
  if (kind === "ferry") return "Cab ferry";
  return "Chai runner";
}

/** Seconds left, or -1 if no active job. */
export function jobSecondsLeft(j: JobState = useJob.getState()): number {
  if (!j.kind) return -1;
  return Math.max(0, Math.ceil((j.deadline - performance.now()) / 1000));
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  return (ax - bx) ** 2 + (az - bz) ** 2;
}

export function atPickup(j: JobState, x: number, z: number): boolean {
  return dist2(x, z, j.fromX, j.fromZ) <= REACH2;
}

export function atDrop(j: JobState, x: number, z: number): boolean {
  return dist2(x, z, j.toX, j.toZ) <= REACH2;
}

/**
 * Build the bottom prompt line for the active job + vehicle context.
 * Returns null when the normal vehicle prompt should win.
 */
export function jobPrompt(
  j: JobState,
  ctx: { x: number; z: number; mode: string; vehicle: number; hasPassenger: boolean },
): string | null {
  if (!j.kind) return null;
  const left = jobSecondsLeft(j);
  if (left === 0) return "E  Job failed · time’s up — cancel";
  if (j.kind === "delivery") {
    if (j.stage === "pickup") {
      if (atPickup(j, ctx.x, ctx.z)) return `E  Pick up parcel · ${j.fromLabel}`;
      return `Parcel at ${j.fromLabel} · ${left}s`;
    }
    if (ctx.mode === "foot") return `F  Grab a ride · drop at ${j.toLabel} · ${left}s`;
    if (atDrop(j, ctx.x, ctx.z)) return `E  Deliver to ${j.toLabel}`;
    return `Drop at ${j.toLabel} · ${left}s`;
  }
  if (j.kind === "chai") {
    if (j.stage === "pickup") {
      if (atPickup(j, ctx.x, ctx.z)) return `E  Grab chai tray · ${j.fromLabel}`;
      return `Chai at ${j.fromLabel} · ${left}s`;
    }
    if (atDrop(j, ctx.x, ctx.z)) return `E  Serve chai · ${j.toLabel}`;
    return `Chai → ${j.toLabel} · hold Tab for Chai break · ${left}s`;
  }
  // ferry
  if (j.needPassenger && !ctx.hasPassenger) {
    if (ctx.vehicle !== 3 && ctx.mode === "foot") return `F / 3  Cab up · wait for a friend · ${left}s`;
    if (ctx.vehicle !== 3) return `3  Switch to Cab · ferry needs a cab · ${left}s`;
    return `Wait for a friend to hop in (F) · then ${j.toLabel} · ${left}s`;
  }
  if (atDrop(j, ctx.x, ctx.z) && ctx.hasPassenger) return `E  Drop friend at ${j.toLabel}`;
  return `Ferry → ${j.toLabel} · ${left}s`;
}
