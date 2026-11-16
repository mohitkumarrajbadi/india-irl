/** Last plan id — survives refresh (relay still owns TTL / joined list). */
const KEY = "india-irl:lastPlan";

export function loadLastPlanId(): string | null {
  try {
    const id = localStorage.getItem(KEY);
    if (!id || !/^[a-zA-Z0-9_-]{4,24}$/.test(id)) return null;
    return id;
  } catch {
    return null;
  }
}

export function saveLastPlanId(id: string | null): void {
  try {
    if (!id) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, id);
  } catch {
    /* private mode */
  }
}
