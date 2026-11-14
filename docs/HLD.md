# HLD — India IRL Runtime

## 1. System context

```
┌─────────────┐   HTTPS (closed)   ┌──────────────┐
│  Browser    │◄──────────────────►│ OMem gateway │
│  apps/web   │                    └──────────────┘
│             │   WS discover      ┌──────────────┐
│  R3F main   │◄──────────────────►│ City relay   │
│  thread     │   WebRTC nearby    └──────────────┘
│      │      │◄──── DC / media ──►│ Peer clients │
│      │ postMessage               └──────────────┘
│      ▼      │
│ Sim Worker  │  Rapier @ 60Hz, vehicles, ambient AI
│ Net Worker  │  binary encode/decode (future)
└─────────────┘
```

## 2. Ownership matrix

| Concern | Owner package | Thread | Notes |
| --- | --- | --- | --- |
| Render / HUD / fullscreen | `apps/web` | Main | No physics |
| Fixed-step physics | `packages/engine` | Sim worker | Rapier only here |
| Intent normalization | `packages/engine` `input/` | Main → worker | Thin |
| Pose binary + Hermite | `packages/network` | Net worker / main | |
| City gen / meets | `apps/web/src/world` | Main | Pure functions OK |
| Mod manifests | `packages/mods` | Main | Data only |
| Shared constants | `packages/shared` | Any | |

## 3. Data flow (shadow phase → cutover)

**Phase A (current next step) — Shadow**

1. Existing arcade controller still **authors** transforms (source of truth).
2. `SimBridge` receives the same intent + spawns a ghost auto.
3. Snapshots are logged / optionally drawn as a debug ghost mesh.
4. No gameplay dependency on Rapier yet.

**Phase B — Dual** (`?rapierDrive=1`) — see `docs/LLD-phase-b.md`

- Foot remains arcade; vehicles use Rapier when flag on.
- `driveAuthority.*` thin hooks; arcade `stepDrive` is fallback until worker ready.

**Phase C — Cutover** (`?simCore=1`) — see `docs/LLD-phase-c.md`

- Snapshots author local **foot + vehicle**; arcade is cold fallback until worker ready.
- Passenger mode stays arcade (peer follow).

**Phase D — Net v2** (`?netV2=1`) — see `docs/LLD-phase-d.md`

- Binary `sb` poses, Hermite remotes, codec worker; relay still discovers / fans out.

**Phase E — Social** (`?socialV2=1`) — see `docs/LLD-phase-e.md`

- PositionalAudio voice, meet hangout sit anchors, IndexedDB business cards via relay `card`.

**Phase F — Content** (`?contentV2=1`) — see `docs/LLD-phase-f.md`

- 9-cell stream catalog for splat/GLB; declarative `?mod=` packs; HUD fullscreen for streamers.

**Phase G — Monorepo** — see `docs/LLD-phase-g.md`

- Client lives in `apps/web` (`@india-irl/web`); npm workspaces wire `packages/*`.

**Deferred (post-playtest)** — OMem Tier-1 NPCs and moving Tier-2/3 ambient AI into the sim worker. v1 keeps seeded client-side peds/traffic (no cloud agent cost).

## 4. Error / isolation boundaries

- Worker crash → `SimBridge` surfaces `onEvent` / restart; game stays on arcade until ready.
- Net failure → relay fallback (existing); P2P optional.
- Mod load failure → skip pack; never execute foreign JS.

## 5. Non-functional targets

| Metric | Target |
| --- | --- |
| Display FPS | ≥60 mid laptop |
| Sim tick | 60 Hz fixed, ≤10 ms |
| Main script budget | ≤8 ms / frame |
| File size | ≤120 LOC soft / 150 hard |
