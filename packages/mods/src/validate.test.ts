import { parseManifestJson } from "./validate.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const ok = parseManifestJson({
  id: "pack",
  name: "Pack",
  version: "1.0.0",
  assets: [
    { type: "glb", url: "/mods/a.glb", cell: [1, -2] },
    { type: "clothes", slot: "top", glb: "./shirt.glb" },
  ],
});
assert(ok.ok, "valid");
if (ok.ok) {
  assert(ok.manifest.assets.length === 2, "assets");
  assert(ok.manifest.assets[0]?.type === "glb", "glb");
}

const badUrl = parseManifestJson({
  id: "x",
  name: "x",
  version: "1",
  assets: [{ type: "splat", url: "https://evil.example/a.splat", cell: [0, 0] }],
});
assert(!badUrl.ok, "reject remote host");

const blob = parseManifestJson({
  id: "x",
  name: "x",
  version: "1",
  assets: [{ type: "glb", url: "blob:abc", cell: [0, 0] }],
});
assert(!blob.ok, "reject blob");

console.log("validate.test.ts ok");
