/** Validate declarative mod manifests (no code execution). */
import { assertSafeModUrl, type ModAsset, type ModManifest } from "./index.ts";

export type ValidateOk = { ok: true; manifest: ModManifest };
export type ValidateErr = { ok: false; error: string };
export type ValidateResult = ValidateOk | ValidateErr;

const DEFAULT_HOSTS: readonly string[] = [];

export function parseManifestJson(raw: unknown, allowHosts: readonly string[] = DEFAULT_HOSTS): ValidateResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "manifest must be an object" };
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || !m.id.trim()) return { ok: false, error: "missing id" };
  if (typeof m.name !== "string") return { ok: false, error: "missing name" };
  if (typeof m.version !== "string") return { ok: false, error: "missing version" };
  if (!Array.isArray(m.assets)) return { ok: false, error: "assets must be an array" };

  const assets: ModAsset[] = [];
  for (const a of m.assets) {
    const parsed = parseAsset(a, allowHosts);
    if (!parsed.ok) return parsed;
    assets.push(parsed.asset);
  }

  return {
    ok: true,
    manifest: {
      id: m.id.trim().slice(0, 64),
      name: String(m.name).slice(0, 80),
      version: String(m.version).slice(0, 32),
      assets,
      anchors: Array.isArray(m.anchors) ? (m.anchors as ModManifest["anchors"]) : undefined,
      minigame:
        m.minigame && typeof m.minigame === "object" && typeof (m.minigame as { entry?: string }).entry === "string"
          ? { entry: String((m.minigame as { entry: string }).entry).slice(0, 200) }
          : undefined,
    },
  };
}

function parseAsset(
  a: unknown,
  allowHosts: readonly string[],
): { ok: true; asset: ModAsset } | ValidateErr {
  if (!a || typeof a !== "object") return { ok: false, error: "bad asset" };
  const o = a as Record<string, unknown>;
  if (o.type === "clothes") {
    if (typeof o.slot !== "string" || typeof o.glb !== "string") return { ok: false, error: "clothes needs slot+glb" };
    if (!assertSafeModUrl(o.glb, allowHosts)) return { ok: false, error: `unsafe clothes url` };
    return { ok: true, asset: { type: "clothes", slot: o.slot.slice(0, 32), glb: o.glb } };
  }
  if (o.type !== "splat" && o.type !== "glb" && o.type !== "texture") {
    return { ok: false, error: "unknown asset type" };
  }
  if (typeof o.url !== "string" || !assertSafeModUrl(o.url, allowHosts)) {
    return { ok: false, error: "unsafe or missing url" };
  }
  if (!Array.isArray(o.cell) || o.cell.length !== 2) return { ok: false, error: "cell [cx,cz] required" };
  const cx = Number(o.cell[0]);
  const cz = Number(o.cell[1]);
  if (!Number.isFinite(cx) || !Number.isFinite(cz)) return { ok: false, error: "bad cell" };
  return { ok: true, asset: { type: o.type, url: o.url, cell: [cx | 0, cz | 0] } };
}
