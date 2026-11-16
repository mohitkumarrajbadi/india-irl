/**
 * Meet plaza helpers — pure logic shared by client spawn / stats UI.
 * Relay uses a duplicated coordinate table in server/meet-centers.mjs
 * (same numbers from generateCity; keep in sync when meets move).
 */

import type { CityId } from "./types";
import { isCityId, resolveCityId, resolveMeetId } from "./city-aliases.ts";

export { isCityId, resolveCityId, resolveMeetId };

/** Meters — player counts toward a meet if within this radius. */
export const MEET_RADIUS = 40;
export const MEET_RADIUS2 = MEET_RADIUS * MEET_RADIUS;

export type MeetCenter = { id: string; label: string; x: number; z: number };

export type DeepLink = {
  city: CityId | null;
  meet: string | null;
  join: string | null;
  plan: string | null;
};

/** Parse viral deep-link query params (legacy city/meet ids aliased). */
export function parseDeepLink(search: string | URLSearchParams): DeepLink {
  const q = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search : `?${search}`) : search;
  const city = resolveCityId(q.get("city"));
  const meetRaw = q.get("meet")?.replace(/[<>]/g, "").slice(0, 32) || null;
  const meet = city ? resolveMeetId(city, meetRaw) : meetRaw;
  const join = q.get("join")?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || null;
  const plan = q.get("plan")?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || null;
  return { city, meet, join, plan };
}

export function nearestMeet(
  x: number,
  z: number,
  centers: readonly MeetCenter[],
  radius2 = MEET_RADIUS2,
): MeetCenter | null {
  let best: MeetCenter | null = null;
  let bd = radius2;
  for (const m of centers) {
    const d = (m.x - x) ** 2 + (m.z - z) ** 2;
    if (d <= bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

export function localTitleFor(cityName: string, meetLabel: string | null): string {
  if (meetLabel) {
    // "Koramangala 5th Block" → "Koramangala Local"
    const head = meetLabel.split(/[·•|,]/)[0]?.trim().split(/\s+/)[0] ?? meetLabel;
    return `${head} Local`;
  }
  return `${cityName} Local`;
}

/** Short identity caption from a look key — customization dopamine. */
export function identityCaption(lookKey: string): string {
  let h = 0;
  for (let i = 0; i < lookKey.length; i += 1) h = (h * 31 + lookKey.charCodeAt(i)) >>> 0;
  const lines = [
    "Looks ready for a plaza walk.",
    "That fit says peak-hour energy.",
    "Main-character outfit unlocked.",
    "Soft drip. Friends will clock it.",
    "Desk-to-chai transition complete.",
    "Fresh enough for Hub Plaza selfies.",
  ];
  return lines[h % lines.length];
}

export function buildShareUrl(opts: {
  origin: string;
  city: CityId;
  meet?: string | null;
  join?: string | null;
  plan?: string | null;
}): string {
  const u = new URL(opts.origin);
  u.searchParams.set("city", opts.city);
  if (opts.meet) u.searchParams.set("meet", opts.meet);
  else u.searchParams.delete("meet");
  if (opts.join) u.searchParams.set("join", opts.join);
  else u.searchParams.delete("join");
  if (opts.plan) u.searchParams.set("plan", opts.plan);
  else u.searchParams.delete("plan");
  return u.toString();
}

export function whatsappShareText(opts: {
  cityName: string;
  meetLabel?: string | null;
  here: number;
  talking: number;
  url: string;
}): string {
  const where = opts.meetLabel ? `${opts.meetLabel}, ${opts.cityName}` : opts.cityName;
  const proof =
    opts.here > 0
      ? `${opts.here} here now${opts.talking > 0 ? ` · ${opts.talking} talking` : ""}.`
      : `Be first at ${where}.`;
  return `Walk into ${where}. ${proof} No install — ${opts.url}`;
}
