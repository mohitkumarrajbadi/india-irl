import { cleanName, decodeLook, encodeLook, type Look } from "@/avatar/appearance";
import type { CityId } from "@/world/types";

const STORAGE = "india-irl:profile:v1";

export function loadProfile(): { name: string; look: Look; city: CityId } | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    const p = JSON.parse(raw) as { name?: string; look?: unknown; city?: string };
    const city: CityId =
      p.city === "pune" || p.city === "hyderabad" || p.city === "gurugram" ? p.city : "bengaluru";
    return { name: cleanName(p.name ?? ""), look: decodeLook(p.look), city };
  } catch {
    return null;
  }
}

export function saveProfile(name: string, look: Look, city: CityId): void {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({ name, look: encodeLook(look), city }));
  } catch {
    /* private mode */
  }
}
