import { cleanName, decodeLook, encodeLook, type Look } from "@/avatar/appearance";
import type { CityId } from "@/world/types";
import { resolveCityId } from "@/world/city-aliases";
import {
  PROFILE_COOKIE,
  clearCookie,
  cookiesAllowedForProfile,
  getRememberProfile,
  readCookie,
  setRememberProfile,
  writeCookie,
} from "./cookies.ts";

const STORAGE = "india-irl:profile:v1";

export type SavedProfile = { name: string; look: Look; city: CityId };

function parseProfile(raw: unknown): SavedProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as { name?: string; look?: unknown; city?: string };
  const city = resolveCityId(p.city) ?? "novapura";
  const name = cleanName(p.name ?? "");
  if (!name) return null;
  return { name, look: decodeLook(p.look), city };
}

function readLocal(): SavedProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    return parseProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readFromCookie(): SavedProfile | null {
  try {
    const raw = readCookie(PROFILE_COOKIE);
    if (!raw) return null;
    return parseProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadProfile(): SavedProfile | null {
  return readLocal() ?? readFromCookie();
}

/** Persist name + look when the player asked to remember, or when forcing a manual save. */
export function saveProfile(name: string, look: Look, city: CityId, opts?: { force?: boolean }): boolean {
  const clean = cleanName(name);
  if (!clean) return false;
  if (!opts?.force && !getRememberProfile()) return false;

  const payload = JSON.stringify({ name: clean, look: encodeLook(look), city });
  try {
    localStorage.setItem(STORAGE, payload);
  } catch {
    /* private mode */
  }

  if (cookiesAllowedForProfile()) {
    // Compact cookie — ~1KB looks fine for encoded number arrays
    writeCookie(PROFILE_COOKIE, payload, 90);
  }
  return true;
}

/** Explicit save: turn remember on and write profile + cookies (needs consent for cookies). */
export function saveProfileNow(name: string, look: Look, city: CityId): { ok: boolean; needsConsent: boolean } {
  setRememberProfile(true);
  const needsConsent = !cookiesAllowedForProfile();
  const ok = saveProfile(name, look, city, { force: true });
  return { ok, needsConsent };
}

export function clearSavedProfile(): void {
  try {
    localStorage.removeItem(STORAGE);
  } catch {
    /* private mode */
  }
  clearCookie(PROFILE_COOKIE);
  setRememberProfile(false);
}

export { getRememberProfile, setRememberProfile };
