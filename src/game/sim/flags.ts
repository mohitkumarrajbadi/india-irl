/** Shared feature gates: `?name=1` wins, else localStorage `india-irl:name`. */

export function readFeatureFlag(name: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get(name);
    if (q === "1" || q === "true") return true;
    if (q === "0" || q === "false") return false;
    return window.localStorage.getItem(`india-irl:${name}`) === "1";
  } catch {
    return false;
  }
}

export function setFeatureFlag(name: string, on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`india-irl:${name}`, on ? "1" : "0");
}

/** Phase C: snapshots author local foot + vehicle. */
export function isSimCoreEnabled(): boolean {
  return readFeatureFlag("simCore");
}

/** Phase B vehicles — also on when Phase C is on. */
export function isRapierDriveEnabled(): boolean {
  return isSimCoreEnabled() || readFeatureFlag("rapierDrive");
}

/** Phase A ghost; disabled when B/C is on. */
export function isShadowSimEnabled(): boolean {
  if (isRapierDriveEnabled()) return false;
  return readFeatureFlag("shadowSim");
}

/** Phase D: binary poses + Hermite remotes + codec worker. */
export function isNetV2Enabled(): boolean {
  return readFeatureFlag("netV2");
}
