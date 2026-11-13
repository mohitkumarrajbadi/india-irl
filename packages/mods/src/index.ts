/**
 * Mod packs are declarative JSON + assets. No foreign JS executes in peer tabs.
 * Minigames may use sandboxed iframes with a narrow postMessage API.
 */

export type ModAsset =
  | { type: "splat" | "glb" | "texture"; url: string; cell: [number, number] }
  | { type: "clothes"; slot: string; glb: string };

export type ModManifest = {
  id: string;
  name: string;
  version: string;
  assets: ModAsset[];
  anchors?: { id: string; x: number; y: number; z: number; yaw: number }[];
  minigame?: { entry: string };
};

export function assertSafeModUrl(url: string, allowHosts: readonly string[]): boolean {
  try {
    const u = new URL(url, "https://local.invalid");
    if (u.protocol === "blob:" || u.protocol === "data:") return false;
    if (url.startsWith("/") || url.startsWith("./")) return true;
    return allowHosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
