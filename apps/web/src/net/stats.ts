import { relayHttp } from "./transport";
import type { CityId } from "@/world/types";
import { resolveCityId } from "@/world/city-aliases";

export type MeetStat = { n: number; talking: number };

export type CityStat = {
  online: number;
  talking: number;
  meets: Record<string, MeetStat>;
  recentJoins: { name: string; meet: string | null; at: number }[];
};

export type RoomId = CityId | "ommo";

export type StatsMap = Partial<Record<RoomId, CityStat>>;

function parseCityStat(val: unknown): CityStat | null {
  if (typeof val === "number") {
    return { online: val, talking: 0, meets: {}, recentJoins: [] };
  }
  if (!val || typeof val !== "object") return null;
  const v = val as Record<string, unknown>;
  const meets: Record<string, MeetStat> = {};
  if (v.meets && typeof v.meets === "object") {
    for (const [meetId, m] of Object.entries(v.meets as Record<string, unknown>)) {
      if (!m || typeof m !== "object") continue;
      const mm = m as Record<string, unknown>;
      meets[meetId] = { n: Number(mm.n) | 0, talking: Number(mm.talking) | 0 };
    }
  }
  const recentJoins = Array.isArray(v.recentJoins)
    ? v.recentJoins
        .filter((j): j is { name: string; meet: string | null; at: number } => !!j && typeof j === "object" && typeof (j as { name?: string }).name === "string")
        .map((j) => ({
          name: String(j.name).slice(0, 16),
          meet: typeof j.meet === "string" ? j.meet : null,
          at: Number(j.at) || 0,
        }))
    : [];
  return {
    online: Number(v.online) | 0,
    talking: Number(v.talking) | 0,
    meets,
    recentJoins,
  };
}

/** Normalize legacy flat `{ city: number }` or new rich stats. */
export function normalizeStats(raw: unknown): StatsMap {
  if (!raw || typeof raw !== "object") return {};
  const out: StatsMap = {};
  for (const [city, val] of Object.entries(raw as Record<string, unknown>)) {
    if (city === "ommo") {
      const st = parseCityStat(val);
      if (st) out.ommo = st;
      continue;
    }
    const id = resolveCityId(city);
    if (!id) continue;
    const st = parseCityStat(val);
    if (st) out[id] = st;
  }
  return out;
}

export async function fetchStats(signal?: AbortSignal): Promise<StatsMap> {
  try {
    const r = await fetch(`${relayHttp()}/stats`, { signal });
    if (!r.ok) return {};
    return normalizeStats(await r.json());
  } catch {
    return {};
  }
}

export type PlanInfo = {
  id: string;
  city: CityId | "ommo";
  meet: string;
  hostName: string;
  expiresAt: number;
  joined: string[];
  expired?: boolean;
};

export async function createPlan(city: CityId, meet: string, hostName: string): Promise<PlanInfo | null> {
  try {
    const r = await fetch(`${relayHttp()}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, meet, hostName }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { id: string; expiresAt: number; city: CityId; meet: string };
    return { id: j.id, city: j.city, meet: j.meet, hostName, expiresAt: j.expiresAt, joined: [] };
  } catch {
    return null;
  }
}

export async function fetchPlan(id: string): Promise<PlanInfo | null> {
  try {
    const r = await fetch(`${relayHttp()}/plans/${encodeURIComponent(id)}`);
    if (r.status === 410) {
      const j = (await r.json()) as PlanInfo;
      return { ...j, expired: true };
    }
    if (!r.ok) return null;
    return (await r.json()) as PlanInfo;
  } catch {
    return null;
  }
}

export async function joinPlan(id: string, name: string): Promise<PlanInfo | null> {
  try {
    const r = await fetch(`${relayHttp()}/plans/${encodeURIComponent(id)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) return null;
    return (await r.json()) as PlanInfo;
  } catch {
    return null;
  }
}

export function honestHeadcount(n: number, talking: number, place: string): string {
  if (n <= 0) return `Be first at ${place}`;
  if (talking > 0) return `${n} here now · ${talking} talking`;
  return `${n} here now`;
}
