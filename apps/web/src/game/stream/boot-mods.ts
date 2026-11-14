/** Boot contentV2: load ?mod= manifest into the stream catalog. */
import { loadModManifest } from "@india-irl/mods";
import { isContentV2Enabled } from "@/game/sim/flags";
import { toast } from "@/game/store";
import { catalogAddManifest, catalogClear } from "./catalog";

export async function bootContentStreaming(): Promise<void> {
  if (typeof window === "undefined" || !isContentV2Enabled()) return;
  catalogClear();
  const q = new URLSearchParams(window.location.search).get("mod");
  const url = q && q.length > 0 ? q : "/mods/example.json";
  if (!url.startsWith("/") && !url.startsWith("./")) {
    toast("Mod URL must be relative for now");
    return;
  }
  const result = await loadModManifest(url, []);
  if (!result.ok) {
    toast(`Mod failed: ${result.error}`);
    return;
  }
  const n = catalogAddManifest(result.manifest);
  toast(`Mod “${result.manifest.name}” · ${n} streamed assets`);
}
