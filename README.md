# India IRL

A browser open world of India's IT cities. Build a character, pick Bengaluru, Pune, Hyderabad or Gurugram, then walk, ride and hang out with other people who are online in the same city.

## Run

```bash
npm install
npm run dev
```

`npm run dev` starts the Next.js app on <http://localhost:3000> and the multiplayer relay on `ws://localhost:8787`. Click the scene to capture the mouse, and press Esc to release it.

Scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Relay and Next dev server together |
| `npm run dev:web` | Next dev server only (multiplayer falls back to same-browser tabs) |
| `npm run relay` | Relay only |
| `npm run check` | Collision and world generator tests |
| `npm run typecheck` | TypeScript check |
| `npm run build` / `npm start` | Production build and server |

## Cities

Each city is generated from a seed by a pure function (`apps/web/src/world/generate.ts`), so every player sees the same streets without sending any geometry over the network.

| City | Districts | Landmarks |
| --- | --- | --- |
| Bengaluru | Koramangala, HSR Layout, Bellandur ORR, Indiranagar, Cubbon Park | Vidhana Soudha, Ecospace Tech Park, Namma Metro Purple Line |
| Pune | Hinjewadi IT Park, Magarpatta, Koregaon Park, FC Road, Peth Area | Shaniwar Wada, Rajiv Gandhi Infotech Park gate, Pune Metro |
| Hyderabad | HITEC City, Gachibowli, Madhapur, Banjara Hills, Old City | Charminar, Cyber Towers, Durgam Cheruvu lake with cable bridge, Hyderabad Metro |
| Gurugram | DLF Cyber City, Udyog Vihar, Golf Course Road, Sector 29 | DLF Cyber Hub, Cyber City towers, Rapid Metro |

Each city has arterial roads with medians and zebra crossings, left-hand traffic, streets lined with trees and lamps, bus stops, chai stalls, wandering cows, parked scooters and autos, shop signs and billboards, and an elevated metro line with stations.

Time of day follows the real clock in India, so friends in different cities see the same sky. Press `T` to cycle sunrise, morning, noon, golden hour and night.

## Character creator

Body type, skin tone, hair style and colour, outfit and colour, and accessories (glasses, company ID, laptop bag, headphones, bindi or tilak, beard). The preview can play the emotes. Your look and name are saved in `localStorage`.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sprint, or boost in a vehicle |
| Space | Jump, or handbrake in a vehicle |
| 1 / 2 / 3 | Book an auto-rickshaw, scooter or cab |
| E | Hop off, or hop in as a passenger next to another player's vehicle |
| H | Horn |
| Z / X / C / V | Wave, namaste, bhangra, chai break |
| R / G | Punch / kick nearby players (on foot) |
| Enter | Chat (shows as a bubble above your head) |
| T | Cycle time of day |
| Q | Cycle graphics quality (Auto / Low / Medium / High) |
| M | Toggle mic / enable proximity voice |
| Mouse wheel | Zoom |

On phones and tablets: drag left to move, drag right to look, use the on-screen buttons for vehicles and emotes.

### Deep links & share

| Param | Meaning |
| --- | --- |
| `city` | `bengaluru` · `pune` · `hyderabad` · `gurugram` |
| `meet` | Meet plaza id for that city (e.g. `cyber-hub`, `koramangala`) |
| `join` | Friend's player id — spawn ~2.5 m beside them if they're online |
| `plan` | In-memory plan id from **Start a plan** (TTL 2h on the relay) |

Examples: `/?city=gurugram&meet=cyber-hub`, `/?city=bengaluru&meet=koramangala&join=<id>`. Menu **WhatsApp** / **Copy invite** include live headcounts when the relay is up. **Invite to me** (in-world) adds `join=<selfId>`.

Open Graph title/description come from the server page and pull live counts from the relay when available. Set `RELAY_HTTP_URL` (or `NEXT_PUBLIC_RELAY_URL`) in production so OG fetch reaches the relay; if the relay is down, copy stays static — no invented numbers.

### Relay HTTP

| Route | Shape |
| --- | --- |
| `GET /stats` | Per city: `{ online, talking, meets: { id: { n, talking } }, recentJoins: [{ name, meet, at }] }` |
| `POST /plans` | `{ city, meet, hostName }` → `{ id, expiresAt, … }` |
| `GET /plans/:id` | Plan payload (410 when expired) |
| `POST /plans/:id/join` | `{ name }` appends to `joined` |

Meet occupancy: nearest plaza within **40 m** of last pose. Talking = sockets with mic live (`vm` message) in that meet. Plans are **in-memory** on the relay process only.

### Proximity voice

Press **M** or the HUD **Mic** button to enable the mic (browser permission required). You only link to people within ~28 m, capped at 6 simultaneous peers. Volume falls off with distance. Click again to mute; right-click the HUD button to turn voice off entirely.

Voice is a small WebRTC mesh with signaling over the same relay (STUN via Google). Same-network / two-tab testing works well. Strict NATs may need a TURN server later; a full SFU (e.g. LiveKit) is the path if you outgrow the 6-peer nearby mesh.

Computer-driven traffic (cars, autos, scooters, buses, trucks) follows the road graph with brake-on-obstacle logic.

Street life extras differ by city: fruit and flower carts, roadside shrines, news stands, water tankers, and construction cranes (heavier in Gurugram tech corridors, denser market clutter in Hyderabad Old City). Billboards use city-specific hiring lines.

## Sound

All sounds are synthesised in the browser (no audio assets). Footsteps while walking, a soft district ambient bed (market / tech / park / night), vehicle engines when you drive, horns (`H` and distant traffic), and short cues for Wave / Namaste / Bhangra / Chai break. Click the scene once so the browser unlocks audio.

## Multiplayer

`server/relay.mjs` is a small WebSocket relay with one room per city. It validates and clamps everything it receives, rate limits each client, and caps rooms at 60 people. Clients send state faster when moving and slower when idle. The relay uses **spatial interest**: full-rate updates within ~90 m, throttled mid-range, and a slow heartbeat beyond ~200 m so distant players stay on the map without flooding everyone. Remote avatars also LOD (full / half-rate pose / sparse) by distance. Clients interpolate remotes ~110 ms behind, with short dead reckoning when packets are late.

If the relay is not reachable the client falls back to `BroadcastChannel`, so two tabs of the same browser still see each other. To run against a deployed relay, set `NEXT_PUBLIC_RELAY_URL` (for example `wss://relay.example.com`) at build time.

## Known limits

- Traffic uses a shared city seed and a sparse host snapshot so fleets stay roughly aligned; close-range collisions still prefer your local sim. Sidewalk NPCs are seeded per city (counts scale with graphics quality).
- Plans and join tickers live only while that relay process is up (no DB yet).
- Menu / HUD social proof uses real relay counts only — empty plazas say “Be first”, never fake FOMO.

## Layout

```
server/        relay
apps/web/src/world/     deterministic city generator, configs, types
apps/web/src/gfx/       geometry builders, shaders, textures, day/night
apps/web/src/avatar/    look, rig, poses, actor
apps/web/src/vehicles/  models, drive physics, traffic AI
apps/web/src/net/       transport, store, interpolation
apps/web/src/components world, player, HUD, menu
```

North is +Z and east is −X. One world unit is one meter.

## Architecture (production target)

| Doc | What |
| --- | --- |
| [docs/TDD.md](docs/TDD.md) | Product / system design |
| [docs/HLD.md](docs/HLD.md) | Runtime ownership & data flow |
| [docs/LLD-engine.md](docs/LLD-engine.md) | Engine file contracts |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | LOC limits, layering, naming |

**Shadow Rapier (Phase A):** `?shadowSim=1` — green wireframe ghost; arcade stays authoritative.

**Rapier drive (Phase B):** `?rapierDrive=1` — vehicles on physics worker; foot arcade. See `docs/LLD-phase-b.md`.

**Sim core (Phase C):** `?simCore=1` — foot + vehicles from Rapier snapshots (arcade only until worker ready). See `docs/LLD-phase-c.md`.

**Net v2 (Phase D):** `?netV2=1` — binary poses + Hermite remotes + codec worker; relay unchanged for rooms. See `docs/LLD-phase-d.md`.

**Social (Phase E):** `?socialV2=1` — 3D voice, sit at meet benches (E), business card (local IndexedDB). See `docs/LLD-phase-e.md`.

**Content (Phase F):** `?contentV2=1` — stream splat/GLB by chunk; optional `?mod=/mods/example.json`; Fullscreen in the HUD dock. See `docs/LLD-phase-f.md`.

**Deferred:** OMem / worker ambient AI — after playtest (see `docs/TDD.md` §7).

Monorepo (`npm run dev` → relay + `@india-irl/web`):

```
apps/web/           Next.js + R3F client
packages/engine/    Rapier sim worker, raycast vehicles, input intent
packages/network/   Hermite interp + codec helpers
packages/mods/      Declarative mod manifests (no peer JS)
packages/shared/    Tick rates, VK, action ids
server/             WebSocket relay
```
