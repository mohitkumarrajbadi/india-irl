/**
 * Shared prop break / respawn — only meaningful sources (stalls, lamps, extras, trees).
 * Wire: { t: "db", s: "st"|"ex"|"lp"|"tr", i: index, free?: 1 }
 * Debris particles stay local; remotes get hide/respawn + soft debris.
 */
import { runtime } from "@/game/runtime";
import {
  isSharedBreakSource,
  type DestSource,
} from "@/game/destructible-catalog";
import { setDestructibleBreakHook } from "@/game/destructible-sim";

export type BreakWireSource = "st" | "ex" | "lp" | "tr";

type Sender = ((msg: { t: string } & Record<string, unknown>) => void) | null;
let sendRaw: Sender = null;

const SOURCE_TO_WIRE: Record<Exclude<DestSource, "shrub">, BreakWireSource> = {
  stall: "st",
  extra: "ex",
  lamp: "lp",
  tree: "tr",
};

const WIRE_TO_SOURCE: Record<BreakWireSource, DestSource> = {
  st: "stall",
  ex: "extra",
  lp: "lamp",
  tr: "tree",
};

export function setBreakSender(fn: Sender): void {
  sendRaw = fn;
  setDestructibleBreakHook((source, index, free) => {
    broadcastBreak(source, index, free);
  });
}

export function broadcastBreak(source: DestSource, index: number, free = false): void {
  if (!isSharedBreakSource(source) || source === "shrub") return;
  const s = SOURCE_TO_WIRE[source];
  sendRaw?.({ t: "db", s, i: index | 0, free: free ? 1 : 0 });
}

export function applyBreakMessage(msg: Record<string, unknown>): void {
  const wire = msg.s;
  if (wire !== "st" && wire !== "ex" && wire !== "lp" && wire !== "tr") return;
  const index = Number(msg.i);
  if (!Number.isFinite(index) || index < 0) return;
  const sim = runtime.destructibles;
  if (!sim) return;
  const source = WIRE_TO_SOURCE[wire];
  const free = Number(msg.free) === 1;
  if (free) sim.applyRemoteRespawn(source, index | 0);
  else sim.applyRemoteBreak(source, index | 0, performance.now());
}
