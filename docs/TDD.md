# India IRL — Technical Design Document

**Status:** Architecture locked for refactor  
**Audience:** Engine, network, client, mods  
**Principle:** Main thread renders. Workers simulate & net. Proprietary brain stays off-repo.

---

## 0. Verdict (read this first)

Ship a **hybrid open-core monorepo**: open client + ECS/physics/network packages; closed OMem edge. Keep the existing **city relay for discovery + spatial interest**; use **WebRTC data channels only for nearby high-rate pose/voice/handshakes**. Pure serverless PeerJS mesh for all movement will melt mid-range phones — do not do that.

**Streamers:** Fullscreen + browser cast. No Twitch/YouTube chat API in v1.

**Moat:** Live player density, meet/plan deep links, OMem NPC memory, identity handshakes that only work on the official graph — not secret client code.

---

## 1. Thread & Data Model (Gregory + Fabian)

| Thread | Hz | Owns | Must never |
| --- | --- | --- | --- |
| **Main (R3F)** | display | Three scene graph, splat/GLB mounts, HUD, diegetic prompts, Web Audio sinks | Allocate per-frame; run Rapier; JSON-parse net |
| **Sim Worker** | fixed 60 | bitECS world, Rapier step, vehicles, combat events, ambient FSM/boids | Touch DOM/Three |
| **Net Worker** | as-needed | Binary encode/decode, PeerJS/WebRTC DC, interest culling of outbound | Block sim tick |

**ECS:** `bitecs` in the sim worker (SoA, cache-friendly). Main thread holds a **read-only snapshot ring** (SharedArrayBuffer when COOP/COEP allows; else transferable `ArrayBuffer` copies at 60 Hz). React never owns gameplay state — it samples snapshots.

**Fixed step:** `dt = 1/60`, accumulator on worker. Render interpolates between last two snapshots (Gregory §7.5.3).

```
Input (main) ──postMessage──► Sim Worker (ECS + Rapier @ 60Hz)
                                    │
                                    ├── snapshot SAB / buffer ──► Main (R3F bind)
                                    └── events (hits, impacts) ──► Net Worker + Main (SFX/shake)
Net Worker ◄──binary──► peers / relay signaling
OMem Edge  ◄──HTTPS──► Tier-1 NPC proxy peer only (closed)
```

---

## 2. Monorepo Directory Structure

```
india-irl/
├── apps/
│   └── web/                      # Next.js + R3F shell (migrates from ./src)
│       ├── app/                  # routes, layout, OG
│       ├── components/           # HUD, menu, diegetic prompts, fullscreen
│       ├── scene/                # Canvas, cameras, splat/GLB mounts only
│       └── public/mods/          # optional local mod packs (dev)
│
├── packages/
│   ├── engine/                   # OPEN — simulation core
│   │   ├── src/
│   │   │   ├── ecs/              # bitecs components, queries, systems
│   │   │   ├── physics/
│   │   │   │   ├── sim-worker.ts       # worker entry, 60Hz loop
│   │   │   │   ├── vehicle.ts          # RaycastVehicleController
│   │   │   │   ├── combat.ts           # hitboxes → event queue
│   │   │   │   ├── protocol.ts         # main ↔ worker messages
│   │   │   │   └── bridge.ts           # main-thread SimBridge
│   │   │   ├── ai/
│   │   │   │   ├── ambient-fsm.ts      # Tier-2 pedestrians
│   │   │   │   └── strays.ts           # Tier-3 steering/boids
│   │   │   ├── streaming/
│   │   │   │   └── chunk-grid.ts       # 9-cell spatial hash streaming
│   │   │   └── input/
│   │   │       └── unified.ts          # moveVector / look / actions
│   │   └── package.json
│   │
│   ├── network/                  # OPEN transport; CLOSED signaling policy lives server-side
│   │   ├── src/
│   │   │   ├── webrtc/           # PeerJS / raw RTCPeerConnection mesh
│   │   │   ├── protocol/         # binary schemas (pose 15Hz, actions, IMPACT)
│   │   │   ├── interp/           # Hermite remote pose
│   │   │   ├── voice/            # MediaStream → PositionalAudio hooks
│   │   │   └── net-worker.ts
│   │   └── package.json
│   │
│   ├── shared/                   # OPEN types + constants (city ids, VK, actions)
│   │   └── src/
│   │
│   └── mods/                     # OPEN mod SDK (declarative only)
│       ├── src/
│       │   ├── schema/           # JSON Schema for packs
│       │   └── runtime/          # sandbox loader (no foreign JS on peers)
│       └── package.json
│
├── server/                       # CLOSED-ish ops surface
│   ├── relay.mjs                 # existing city rooms + interest (keep)
│   └── omem-gateway/             # NOT in public fork — NPC peer proxy
│
├── docs/
│   └── TDD.md                    # this file
└── package.json                  # workspaces: apps/* packages/*
```

**Open vs proprietary boundary**

| Open | Closed |
| --- | --- |
| `apps/web`, `packages/engine`, `packages/network` client mesh, `packages/mods` SDK | OMem gateway, agent memory, matchmaking policy, API keys, anti-abuse |
| Procedural city seeds, splat/GLB assets under license | Authoritative NPC dialogue + referral outcomes |
| Relay *protocol* docs | Production relay deployment + TURN credentials |

Forks can render and LAN-play; they cannot mint official NPC memory or join the production graph without keys.

---

## 3. Physics Worker — Contracts

### 3.1 Message protocol (main ↔ sim)

See `packages/engine/src/physics/protocol.ts`.

- **In:** `INIT`, `LOAD_CHUNK` / `UNLOAD_CHUNK`, `SET_INPUT`, `SPAWN_VEHICLE`, `ENTER_VEHICLE`, `EXIT_VEHICLE`, `APPLY_IMPULSE`, `NET_REMOTE_POSE` (authority mirrors), `SET_AUTHORITY`
- **Out:** `SNAPSHOT` (transforms SoA), `EVENT` (`HIT`, `IMPACT`, `RAGDOLL`, `SEATED`)

### 3.2 Vehicles

Raycast vehicle in worker (Rapier rigid body + suspension rays). Specs map from current `VK` / `SPECS` (auto, scooter, cab).

**Authority:** Driver client owns the sim for that chassis. Broadcasts pose @ 15 Hz. Passengers attach meshes to local seat anchors (no independent chassis integrate). Remote drivers are kinematic mirrors of Hermite-interpolated net poses.

**Impact → ragdoll:** If `|Δv|` or contact impulse > threshold → emit `IMPACT`, disable character controller, enable ragdoll colliders for N seconds.

### 3.3 Combat

Attack animations expose ephemeral hitbox AABBs in ECS. Unified event queue resolves once per tick → knockback impulse + HP delta → net `HIT` byte packet.

---

## 4. Networking

### 4.1 Topology (pragmatic, not dogma)

1. Connect to **relay** (existing `server/relay.mjs`) for room join + peer ids + low-rate far poses.
2. For peers inside ~40–90 m: upgrade to **WebRTC data channel** for 15 Hz pose + actions + business card.
3. Voice: existing proximity mesh → `THREE.PositionalAudio` (not raw HTMLAudio gain only).

### 4.2 Pose packet (15 Hz)

Binary, ~32–48 bytes:

```
entityId u16 | flags u8 | x y z f32 | qx qy qz qw f32 (or yaw+ lean) | anim u8 | veh u8 | seat u8
```

Client remotes: **Hermite** on position, **slerp** on rotation, hold last anim until next.

### 4.3 Actions

`{ peer, action: u8 }` — Wave=1, Dance=2, Sit=3, Point=4, … (extend emote wheel).

### 4.4 Hangout anchors

Props declare `Anchor { id, pos, quat, audioPriority }`. Sit → move-to-anchor → sync Sit → join localized voice priority set (same VOICE_RANGE logic, boosted weight).

---

## 5. Identity & Business Card (local-first)

- Profile in **IndexedDB** (LinkedIn, IG, WA, Snap, status, demographics). Never uploaded by default.
- In-world request → UI: “Share [LinkedIn, WhatsApp] with Priya?” → encrypted payload over **P2P DC only**.
- Optional later: signed attestations via closed identity service (not required for v1).

---

## 6. Ambient Life (3 tiers)

| Tier | Tech | Thread | Example |
| --- | --- | --- | --- |
| 1 Intelligent vendors | OMem edge; appears as network peer | Net + main dialogue UI | Chai stall owner remembers your title |
| 2 Crowds | FSM + navmesh A* | Sim worker | Sidewalk peds flee/fight (evolve current `pedestrians.ts`) |
| 3 Strays | Steering / boids | Sim worker, cheap budget | Cows / dogs react to IMPACT |

Client never embeds OMem keys. Dialogue tokens stream from gateway; presentation is open.

---

## 7. Streaming & Performance Budget

- **Spatial hash** cells (~64–128 m). Resident set = player cell + 8 neighbors.
- Enter cell → load splat/GLB + collider cook (worker) asynchronously.
- Leave → dispose GPU resources **immediately**; drop collider; cancel pending fetches.
- Quality ladder (keep `quality.ts`): Auto drops splat LOD, ped count, traffic before FPS dies.
- Target: **60 FPS**, main-thread frame < 8 ms script on mid laptop; sim worker < 10 ms/tick.

---

## 8. UI/UX

- `UnifiedInputManager` → `{ moveVector, lookDelta, sprint, jump, interact, actions[] }` from WASD / gamepad / touch.
- **Diegetic prompts only** when raycast hits interactable (“F Drive”, “E Sit”, “F Talk”).
- Feedback: Web Audio (engine, UI ticks), screen shake + **hit-stop** (2–4 frames) on IMPACT/HIT.
- **Fullscreen:** `document.documentElement.requestFullscreen()` + HUD toggle — streamers OBS-capture the tab. No platform chat integration in v1.

---

## 9. Mods (secure UGC)

Mods are **data packs**, not peer-executed JS:

```json
{
  "id": "koramangala-neon",
  "assets": [{ "type": "splat"|"glb"|"texture", "url": "...", "cell": [ix,iz] }],
  "clothes": [{ "slot": "top", "glb": "..." }],
  "anchors": [...],
  "minigame": { "entry": "sandbox.html" }
}
```

- Host loads pack locally / from allowlisted CDN.
- **Minigames** run in sandboxed iframe/`Worker` with no net to peers except declared score events through engine API.
- Peers receive only **asset ids + transforms**, never foreign scripts.

---

## 10. Refactor Roadmap (priority order)

0. **Engineering / HLD / LLD** — `docs/ENGINEERING.md`, `docs/HLD.md`, `docs/LLD-engine.md` (done). Soft 120 LOC/file.
1. **Scaffold packages** + split sim modules + Phase A shadow ghost (`?shadowSim=1`) (done).
2. **Phase B** — `?rapierDrive=1`, `driveAuthority` + frame intent; arcade foot; Rapier chassis (done).
3. **Phase B polish** — chunk collider stream + IMPACT (done).
4. **Phase C** — `?simCore=1` snapshot foot+drive cutover (done); arcade cold fallback only.
5. **Phase D** — `?netV2=1` binary pose + Hermite + codec worker; relay kept (done). See `docs/LLD-phase-d.md`.
6. PositionalAudio voice; hangout anchors; business-card DC.
7. Tier-2/3 AI in worker; Tier-1 OMem gateway behind feature flag.
8. Chunk splat streaming + mod manifest loader.
9. Migrate `src/` → `apps/web`; enable npm workspaces; fullscreen UX polish.

---

## 11. Non-goals (v1)

- Twitch/YouTube interactive streamer API  
- Full SFU for 50+ voice in one plaza (cap mesh; SFU later)  
- Authoritative server physics for all entities  
- Running untrusted mod JavaScript inside other players’ tabs  
