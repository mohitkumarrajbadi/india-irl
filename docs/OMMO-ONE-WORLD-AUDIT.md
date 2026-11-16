# OMMO — One Continuous World Audit

**Date:** 2026-11-15  
**Product brand:** OMMO (UI) · repo/package id remains `india-irl`  
**Principle:** One world. Many cities. Real people. Shared experiences.

This document supersedes the island-map product model in [`OVERHAUL-ROADMAP.md`](./OVERHAUL-ROADMAP.md). Stack, feature flags, arcade default drive, and deep links are preserved.

---

## 1. Current architecture

| Layer | Today |
| --- | --- |
| Authoring | Per-city `CityConfig` (seed, grid, districts, landmarks, meets) |
| Generation | Pure `generateCity(cfg)` → full `CityData` in one pass |
| Runtime | `useGameCity` regenerates on `cityId` / `meetId`; Canvas remounts |
| Render | Eager: ground, buildings, props, terrain apron for **one** city |
| Physics streaming | Opt-in Rapier: 64 m cells, Moore neighborhood |
| Content streaming | Opt-in `contentV2`: splat/GLB via 9-cell catalog |
| Multiplayer | One WebSocket **room per city** (`server/relay.mjs`) |

Cities (~0.8–1 km each): `novapura`, `mandipura`, `neerabad`, `udyogabad`. Each centers on world origin independently — coordinates **collide** if loaded together without offsets.

---

## 2. Map separation

- Switching city remounts Canvas (`key={city.config.id}`) and reconnects the relay room.
- Outer walls enclose each urban fabric; trails die in that city's apron.
- **No** inter-city highways, world atlas, or shared heightfield.
- Meets are plazas within a city, not separate rooms.

Legacy deep links (`?city=bengaluru` etc.) alias to fictional ids via `city-aliases.ts`.

---

## 3. What already exists (evolve, don't rewrite)

- Deterministic procedural pipeline (`CityConfig` → `CityData`)
- 64 m chunk spatial hash + Rapier load/unload
- Region classification + ambient/physics LOD
- Trail / apron / hill systems (corridor prototypes if walls open)
- Spatial interest on relay (near 90 m / mid 200 m / far heartbeat)
- Deep links: `?city=` · `?meet=` · `?join=` · `?plan=`
- Same-browser `BroadcastChannel` fallback when relay unreachable
- Feature flags: `netV2`, `socialV2`, `contentV2`, `rapierDrive`, `simCore`

---

## 4. Gaps for one continuous world

| Gap | Impact |
| --- | --- |
| No world coordinate frame / city anchors | Cannot merge cities |
| No inter-city road graph | Isolated islands |
| No visual instance streaming | 4× cities ≈ memory blowup |
| City-scoped rooms + Canvas remount | Friends cannot convoy between cities |
| No `.env.example` / dual-host deploy docs | Friends invite blocked by ops |
| Silent local fallback | Looks “online” when only same-browser |

---

## 5. Main menu problems

- Three-pane lobby denser than a premium open-world entry
- Brand currently “India IRL”; preview BG hardcoded `#1a4f9c`
- Four city cards imply separate maps
- Feature toggles exposed on lobby; action strip crowded
- Avatar preview functional but underlit / primitive presentation

---

## 6. Networking limitations

- Rooms: one per city, cap 60
- Interest works **within** a room only
- Plans / recent joins are in-memory (lost on relay restart)
- Join IDs are per-connect (invite-to-me dies on host re-enter)
- Claim wreck extras stripped by relay; meet-local parked cars can diverge indices
- `npm start` does **not** start the relay

---

## 7. Deployment blockers

1. Relay must be a **separate always-on Node** process (not Next serverless).
2. `NEXT_PUBLIC_RELAY_URL` required at **build** for non-`:8787` hosts; production needs **WSS**.
3. No origin allowlist, no `/health`, no `.env.example`.
4. Cross-device friends fail if relay is down (BroadcastChannel is same-browser only).

**Recommended friends-test stack:** Next.js on Vercel + `server/relay.mjs` on Fly.io (or equivalent). No Kubernetes.

---

## 8. Technical risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Overlapping city origins | Explicit world anchors (km-scale offsets) |
| 4× mesh memory | Stream visual chunks; never mount all districts |
| Canvas remount on city change | Spawn = teleport inside one session |
| City rooms isolate friends | `worldV1` single room; keep city rooms as fallback |
| Silent BroadcastChannel | Obvious offline / local-only UI + deployed WSS |
| Highway speed vs interest | Larger mid/far + speed-based prefetch ring |
| Outer walls | Corridor gates + stitched highway graph |

---

## 9. Implementation roadmap (summary)

| Phase | Goal |
| --- | --- |
| 0 | This audit + roadmap pointer |
| 1 | Friends deploy of **current** city-room game |
| 2 | Atlas + Novapura ↔ highway ↔ village ↔ Mandipura prototype |
| 3 | Expand Neerabad, Udyogabad, rural/mountain |
| 4 | OMMO menu + destination browser (spawn, not map load) |
| 5 | Flagged `worldV1` single-room MP |
| 6 | typecheck, check, build, multi-client validation |

Do **not** claim friends-ready until two separate clients prove co-presence on a public URL + WSS.

---

## 10. Key paths

- World gen: `apps/web/src/world/generate.ts`, `cities.ts`, `city-*.ts`
- Streaming: `apps/web/src/game/sim/chunk-*.ts`, `packages/engine/src/physics/chunks.ts`
- Menu: `apps/web/src/components/menu/*`
- Net: `apps/web/src/net/*`, `packages/network/*`, `server/relay.mjs`
- Flags: `apps/web/src/game/sim/flags.ts`
