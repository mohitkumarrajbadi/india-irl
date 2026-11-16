# India IRL

A browser open-world social freeroam set in **original fictional Indian cities**. Build a character, pick Novapura, Mandipura, Neerabad or Udyogabad, then walk, ride and hang out with other people online in the same city.

This is not a story campaign and there is no ride-booking — explore, meet people, drive parked vehicles, and play together.

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

| City | Character | Districts | Landmarks |
| --- | --- | --- | --- |
| **Novapura** | Modern tech metropolis | Kaapi Block, Ring Market, Outer Ring Tech, Palm Market, Central Gardens | Assembly Dome, Campus Tech Park, Violet Line metro |
| **Mandipura** | Traditional commercial + hills | Book Street, Peth Ward, Hillgate Campus, Cyberward | Fort Wada Gate, Hillgate Infotech Arch |
| **Neerabad** | Lakeside modern | Lake Tech, Finance Shore, Pearl Market, Old Quarters, Mirror Lake | Four Arch Chowk, Lake Towers, cable bridge |
| **Udyogabad** | Corporate / industrial | Glass Mile, Udyog Park, Food Sector, Fairway Residences | Hub Plaza, Glass Mile Towers, Rapid |

Legacy deep links `?city=bengaluru|pune|hyderabad|gurugram` (and old meet ids) still resolve via aliases.

Each city has arterial roads with medians and zebra crossings, left-hand traffic, streets lined with trees and lamps, bus stops, chai stalls, wandering cows, parked scooters and autos, shop signs and billboards, and an elevated metro line with stations. Village trails and hill approaches sit outside the urban grid.

Time of day follows the real clock in India, so friends in different cities see the same sky. Press `T` to cycle sunrise, morning, noon, golden hour and night. Press `J` to cycle weather.

Overhaul plan: [`docs/OVERHAUL-ROADMAP.md`](docs/OVERHAUL-ROADMAP.md).

## Character creator

Body type, skin tone, hair style and colour, outfit and colour, and accessories (glasses, company ID, laptop bag, headphones, bindi or tilak, beard). The preview can play the emotes. Your look and name are saved in `localStorage`.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sprint, or boost in a vehicle |
| Space | Jump, or handbrake in a vehicle |
| F | Enter a nearby parked / traffic / peer vehicle |
| E | Exit vehicle, or hop in as a passenger next to another player's vehicle |
| H | Horn |
| Z / X / C / V | Wave, namaste, bhangra, chai break |
| B / Y / U | Garba, groove, Bollywood (on foot) |
| Tab | Emote wheel (hold; 1–9 pick emote) |
| R / G | Punch / kick nearby players (on foot) |
| Enter | Chat (shows as a bubble above your head) |
| T | Cycle time of day |
| J | Cycle weather |
| Q | Indicators (blinkers) while driving |
| M | Toggle mic / enable proximity voice |
| N | City map |
| Mouse wheel | Zoom |

On phones and tablets: drag left to move, drag right to look, use the on-screen buttons for vehicles and emotes.

### Deep links & share

| Param | Meaning |
| --- | --- |
| `city` | `novapura` · `mandipura` · `neerabad` · `udyogabad` (legacy real-city ids still alias) |
| `meet` | Meet plaza id for that city (e.g. `hub-plaza`, `kaapi-block`) |
| `join` | Friend's player id — spawn ~2.5 m beside them if they're online |
| `plan` | In-memory plan id from **Start a plan** (TTL 2h on the relay) |

Examples: `/?city=udyogabad&meet=hub-plaza`, `/?city=novapura&meet=kaapi-block&join=<id>`. Menu **WhatsApp** / **Copy invite** include live headcounts when the relay is up. **Invite to me** (in-world) adds `join=<selfId>`.

Open Graph title/description come from the server page and pull live counts from the relay when available. Set `RELAY_HTTP_URL` (or `NEXT_PUBLIC_RELAY_URL`) in production so OG fetch reaches the relay; if the relay is down, copy stays static — no invented numbers.

### Feature flags

Optional URL / localStorage gates (default **off**): `netV2`, `socialV2`, `contentV2`, `rapierDrive`, `simCore`. Arcade vehicle drive remains the default until Rapier is validated.

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

Voice is a small WebRTC mesh with signaling over the same relay (STUN via Google by default). Optional TURN: set `NEXT_PUBLIC_TURN_URLS` (comma-separated), `NEXT_PUBLIC_TURN_USERNAME`, and `NEXT_PUBLIC_TURN_CREDENTIAL` at build time. Same-network / two-tab testing works well. A full SFU (e.g. LiveKit) is the path if you outgrow the 6-peer nearby mesh.

Computer-driven traffic (cars, autos, scooters, buses, trucks) follows the road graph with brake-on-obstacle logic.

Street life extras differ by city: fruit and flower carts, roadside shrines, news stands, water tankers, and construction cranes (heavier in Udyogabad corridors, denser market clutter in Neerabad Old Quarters). Billboards use city-specific hiring lines.

## Sound

All sounds are synthesised in the browser (no audio assets). Footsteps while walking, a soft district ambient bed (market / tech / park / night), vehicle engines when you drive, horns (`H` and distant traffic), and short cues for Wave / Namaste / Bhangra / Chai break. Click the scene once so the browser unlocks audio.

## Multiplayer

`server/relay.mjs` is a small WebSocket relay with one room per city. It validates and clamps everything it receives, rate limits each client, and caps rooms at 60 people. Clients send state faster when moving and slower when idle. The relay uses **spatial interest**: full-rate updates within ~90 m, throttled mid-range, and a slow heartbeat beyond ~200 m so distant players stay on the map without flooding everyone. Remote avatars also LOD (full / half-rate pose / sparse) by distance. Clients interpolate remotes ~110 ms behind, with short dead reckoning when packets are late.

If the relay is not reachable the client falls back to `BroadcastChannel`, so two tabs of the same browser still see each other — **not** cross-device multiplayer. The HUD warns “This browser only” when that happens. To run against a deployed relay, set `NEXT_PUBLIC_RELAY_URL` (for example `wss://relay.example.com`) at build time.

Friends deploy (Vercel + Fly): [`.env.example`](.env.example) · [`docs/DEPLOY-FRIENDS.md`](docs/DEPLOY-FRIENDS.md) · one-world plan: [`docs/OMMO-ONE-WORLD-AUDIT.md`](docs/OMMO-ONE-WORLD-AUDIT.md).

## Known limits

- Traffic uses a shared city seed and a sparse host snapshot so fleets stay roughly aligned; close-range collisions still prefer your local sim. Sidewalk NPCs are seeded per city (counts scale with graphics quality).
- Plans and join tickers live only while that relay process is up (no DB yet).
- Menu / HUD social proof uses real relay counts only — empty plazas say “Be first”, never fake FOMO.
- Rapier drive / netV2 / socialV2 stay opt-in until playtested.

## Layout

```
server/        relay
apps/web/src/world/     deterministic city generator, configs, types
apps/web/src/game/      player loop, vibe, quality, weather
apps/web/src/vehicles/  arcade specs + traffic AI
packages/engine/        Rapier sim worker (flagged)
packages/network/       pose codec + Hermite (flagged)
docs/                   TDD, HLD, LLD, OVERHAUL-ROADMAP
```
