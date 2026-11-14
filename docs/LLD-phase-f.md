# LLD — Phase F (Content streaming + mods + fullscreen)

## Goal

When `?contentV2=1`:

1. **Chunk asset streaming** — load splat/GLB only for the 9-cell neighborhood; dispose on leave.
2. **Mod manifests** — declarative JSON packs merge into the stream catalog (no peer-executed JS).
3. **Fullscreen** — HUD toggle for streamers (tab cast / OBS).

## Flags

| Flag | Behavior |
| --- | --- |
| `contentV2` | Enables stream mounts + optional `?mod=` pack URL/path |

## Modules

| File | Job |
| --- | --- |
| `packages/mods` | `parseManifest`, `validateManifest`, URL allowlist |
| `apps/web/src/game/stream/catalog.ts` | Cell → asset list registry |
| `apps/web/src/game/stream/resident.ts` | Wanted set vs loaded set |
| `apps/web/src/components/world/StreamedContent.tsx` | R3F mount/unmount |
| `apps/web/src/components/world/StreamedAsset.tsx` | One splat (drei) or GLB |
| `apps/web/src/components/hud/FullscreenButton.tsx` | Always-on HUD dock `requestFullscreen` |
| `apps/web/public/mods/example.json` | Sample manifest (empty `assets`; add splat/glb URLs to exercise mounts) |

## Flow

```
boot → optional loadMod(?mod=) → catalog.add
frame → resident.sync(player xz) → React list of active assets
leave cell → unmount → GPU dispose via R3F
```

## Safety

- Only relative `/…` or allowlisted hosts.
- No `blob:` / `data:` / remote JS entries.
- Minigame `entry` is recorded but not auto-executed in v1.

## Constraints

- Soft 120 LOC/file.
- Splat via `@react-three/drei` `<Splat />` (already in deps).
