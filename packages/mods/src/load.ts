/** Fetch + validate a mod manifest from a relative or allowlisted URL. */
import { parseManifestJson, type ValidateResult } from "./validate.ts";
import { assertSafeModUrl } from "./index.ts";

export async function loadModManifest(
  url: string,
  allowHosts: readonly string[] = [],
): Promise<ValidateResult> {
  if (!assertSafeModUrl(url, allowHosts)) return { ok: false, error: "unsafe manifest url" };
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `http ${res.status}` };
    const json: unknown = await res.json();
    return parseManifestJson(json, allowHosts);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}
