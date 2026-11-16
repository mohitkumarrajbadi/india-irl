/** Lightweight first-party cookie helpers for consent + profile. */

const CONSENT_KEY = "ommo_consent";
const REMEMBER_KEY = "ommo_remember";
const PROFILE_COOKIE = "ommo_profile";

export type ConsentChoice = "accepted" | "essential" | null;

function canUseDom(): boolean {
  return typeof document !== "undefined";
}

export function readCookie(name: string): string | null {
  if (!canUseDom()) return null;
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(";")) {
    const s = part.trim();
    if (s.startsWith(prefix)) {
      try {
        return decodeURIComponent(s.slice(prefix.length));
      } catch {
        return s.slice(prefix.length);
      }
    }
  }
  return null;
}

export function writeCookie(name: string, value: string, maxAgeDays: number): void {
  if (!canUseDom()) return;
  const maxAge = Math.max(0, Math.floor(maxAgeDays * 86400));
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearCookie(name: string): void {
  if (!canUseDom()) return;
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getConsent(): ConsentChoice {
  const v = readCookie(CONSENT_KEY);
  if (v === "accepted" || v === "essential") return v;
  try {
    const ls = localStorage.getItem(`india-irl:${CONSENT_KEY}`);
    if (ls === "accepted" || ls === "essential") return ls;
  } catch {
    /* private mode */
  }
  return null;
}

export function setConsent(choice: "accepted" | "essential"): void {
  writeCookie(CONSENT_KEY, choice, 365);
  try {
    localStorage.setItem(`india-irl:${CONSENT_KEY}`, choice);
  } catch {
    /* private mode */
  }
  if (choice === "essential") {
    // Keep localStorage remember; only drop the profile cookie.
    clearCookie(PROFILE_COOKIE);
    clearCookie(REMEMBER_KEY);
  }
}

/** Whether the player opted to remember name/look across visits. */
export function getRememberProfile(): boolean {
  const c = readCookie(REMEMBER_KEY);
  if (c === "1") return true;
  if (c === "0") return false;
  try {
    return localStorage.getItem(`india-irl:${REMEMBER_KEY}`) === "1";
  } catch {
    return false;
  }
}

export function setRememberProfile(on: boolean): void {
  try {
    localStorage.setItem(`india-irl:${REMEMBER_KEY}`, on ? "1" : "0");
  } catch {
    /* private mode */
  }
  if (getConsent() === "accepted") {
    writeCookie(REMEMBER_KEY, on ? "1" : "0", 365);
  } else if (!on) {
    clearCookie(REMEMBER_KEY);
  }
}

export function cookiesAllowedForProfile(): boolean {
  return getConsent() === "accepted";
}

export { PROFILE_COOKIE };
