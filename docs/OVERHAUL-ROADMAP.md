# India IRL — Open-World Social Freeroam Overhaul Roadmap

**Status:** Living plan (audit-driven)  
**Stack preserved:** Next.js · R3F · Three.js · Zustand · Rapier (opt-in) · WS relay · procedural world  
**Flags preserved:** `netV2` · `socialV2` · `contentV2` · `rapierDrive` · `simCore` · `worldV1`  
**Default drive:** Arcade until Rapier is validated  
**Non-goals:** Unity/Unreal · story campaign · ride-booking / Chai Run / summon  

> **Product pivot (2026-11-15):** Island city maps are superseded by **one continuous OMMO world**.  
> See [`OMMO-ONE-WORLD-AUDIT.md`](./OMMO-ONE-WORLD-AUDIT.md) and [`DEPLOY-FRIENDS.md`](./DEPLOY-FRIENDS.md).  
> Per-city polish below remains useful for region packs, but players must not load separate maps.

---

## Audit verdict (2026-11-15)

The project is **not a greenfield**. A working freeroam base already exists: deterministic city gen, terrain apron + trails, flyover mesh, metro, parked enter/exit, traffic/peds/animals, weather + IST, destructibles, vibe XP, city-room multiplayer, and flagged Rapier/net/social/content pipelines.

Biggest problems vs the vision:

| Priority | Problem | Impact |
| --- | --- | --- |
| P0 | Real city identities (Bengaluru/Pune/Hyderabad/Gurugram) + real districts/landmarks | Legal/creative identity; deep links/rooms |
| P0 | Stale player docs / mission hints still teach summon (`1/2/3` book a ride) | Trust / onboarding |
| P1 | Flyover “under” snaps to deck Y — cannot drive under | World believability |
| P1 | Rapier road colliders flat at Y=0; weather/surface grip not in sim | Physics dual-authority |
| P1 | `nandi-view` meet missing from relay `meet-centers.mjs` | Plans / occupancy |
| P2 | Arterials only 2 LHT lanes; no underpasses / service roads | Road network depth |
| P2 | No shared vehicle taken-state / convoy; passengers fragile | Multiplayer social |
| P2 | netV2 / socialV2 opt-in only | Features hidden |
| P3 | Rapier bike = 4-wheel; no visual chassis damage; no true ragdoll | Physics polish |
| P3 | Village trails exist; village *settlements* thin | Rural life |

**Keep working:** arcade drive, F-enter freeroam, city rooms, quality ladder, IST clock, meet deep links, destructible catalog.

---

## Fictional city map

| Archetype | Canonical id | Display | Inspired by (not named) |
| --- | --- | --- | --- |
| A — Tech metropolis | `novapura` | Novapura | Garden / IT campus cities |
| B — Traditional commercial | `mandipura` | Mandipura | Market + monsoon-hill cities |
| C — Lakeside modern | `neerabad` | Neerabad | Deccan lakeside tech cities |
| D — Corporate industrial | `udyogabad` | Udyogabad | Glass-corridor corporate cities |

Legacy `?city=bengaluru|pune|hyderabad|gurugram` resolves via aliases to the canonical id (same for meet ids).

---

## Phase plan (dependency-aware)

### Phase 1 — Hygiene + identity *(done)*
1. Fictional city / district / meet / landmark identity + deep-link aliases  
2. Sync relay `MEET_CENTERS` (incl. ridge-view)  
3. Remove obsolete job/summon copy (README, vibe hints, MapJob UI, `easy_job` → `first_ride`)  
4. Typecheck + `npm run check`  

### Phase 2 — Terrain & roads *(advanced)*
1. ~~Shared vertical sample: deck vs under-flyover clearance~~ (arcade `yHint` + ramps)  
2. ~~Rapier road builder samples terrain height + flyover deck~~  
3. ~~3-lane arterials (`ARTERIAL_WIDTH` 22, `ARTERIAL_LANES` ×3)~~  
4. ~~Underpasses~~ (dipped arterial + retaining walls + Rapier/arcade sample)  
5. ~~Village settlement clusters~~ along rural trails  
6. ~~Mountain hairpin/guardrail fidelity~~ (outer rail AABBs + bend posts; denser visual rails)  

### Phase 3 — Rapier physics (flagged)
1. ~~Profile arcade vs Rapier separately~~ (`drive-profile` + `?driveProfile=1` HUD)  
2. ~~Wire terrain/weather grip into Rapier (`SimInput.gripMul`)~~ — health still arcade-only  
3. ~~True 2-wheel bike tuning~~ + ~~rider separation~~ (`separableRider` eject + chassis stash/remount)  
4. ~~Unify IMPACT / arcade collision severity~~ (`impact-severity` → `vehicleHitSeverity`)  
5. Keep arcade default until `driveProfile` shows **PASS** (Rapier p95 ≤ 2.8 ms, fallback ≤ 8%)  
6. ~~Visual chassis damage~~ (`setChassisHealth` scuff/crumple from `chassisHp`)  
7. ~~Atmosphere polish deferred to Phase 9~~

### Phase 4 — Vehicle ecosystem MP *(started)*
1. ~~Replicate parked/traffic **taken** state~~ (`cl` claim wire + relay)  
2. ~~Stabilize passenger attach~~ (450 ms grace) + traffic release on exit  
3. ~~Entry/exit polish~~ (door-side exit pick, chassisHp remount, tighter traffic enter)  
4. Garage hooks later

### Phase 5 — Destructibles polish *(done)*
1. ~~Debris pooling + material thresholds~~ (reclaim oldest; `MATERIAL_THRESHOLDS` / `classifyHit`)  
2. ~~Sync only meaningful shared break state~~ (`db` wire for stall/extra/lamp/tree; shrubs local-only)

### Phase 6 — Ambient life LOD *(done)*
1. ~~Density by region (village ≪ city)~~ (`ambient-lod` REGION_LOD profiles)  
2. ~~Interest-scoped authority / local backdrop~~ — traffic host snaps by LOD; peds/animals local-only

### Phase 7 — Social freeroam *(started)*
1. ~~Menu toggles for socialV2 / netV2~~ (still opt-in; not default-on)  
2. ~~Convoys~~ (`cv` invite / join / regroup marker · `C` / `Shift+C`)  
3. ~~Meet plaza density~~ (5-seat plaza ring + ped bias) + ~~plan id persistence~~ (localStorage)

### Phase 8 — Apartments / customization / Vibe *(started)*
1. ~~Apartment interiors + invite~~ (resi doors, room volume, `ap` wire, `home` mission)  
2. ~~Garage paints / cosmetics by vibe level~~ (`P` cycle; scooter tint)

### Phase 9 — Atmosphere *(done)*
1. ~~Wet reflections, fog/mist, streetlight/headlight polish~~ (`atmosphere-fx` + `Mist`; wired into CityGround / Atmosphere / lamps / headlights / rain bed)  
2. ~~Weather → grip already started; deepen ambience~~ (wet afterglow rain audio; mistFog lerp)

### Phase 10 — Perf & net *(done)*
1. ~~Physics LOD zones~~ (`physics-lod` ring 0–2 → collider neighborhood) · ~~instance inventory helper~~ (`instance-inventory`)  
2. ~~Snapshot interp defaults~~ (`REMOTE_INTERP_*`) · ~~interest tiers + token-bucket~~ · ~~voice TURN path~~ (`voice-ice` + `NEXT_PUBLIC_TURN_*`)  

### Critical bugfix + Phase 2–4 *(done)*
1. ~~Traffic spawn FOV / LHT AI / F-enter / bike wreck / pop-in~~  
2. ~~Sim stability (junction, follow, LOD, ped FOV, wreck sync)~~  
3. ~~Ambient life (cross signals, dogs, village bias, yield, grip, Rapier health)~~  
4. ~~Validation: `npm run typecheck` · `npm run check` · browser enter Novapura · `phase4-acceptance.test.ts`~~  

**After each phase:** typecheck · lint/tests · `npm run dev` · browser playtest · profile · fix regressions · update this doc.

---

## Acceptance checklist (target)

- [x] Four original fictional cities (canonical ids + aliases) — Phase 1  
- [x] Drive under flyover mid-span (arcade) — Phase 2 start  
- [x] Rapier roads follow terrain / flyover deck; 3-lane arterials  
- [x] Shared vehicle claims + passenger grace  
- [x] Underpasses + village settlements + 2-wheel Rapier bikes  
- [x] Rider separation on severe bike IMPACT; IMPACT unify; mountain guardrails  
- [x] Visual chassis damage from hits (paint/crumple)  
- [x] Arcade vs Rapier step profiler + budgets (`?driveProfile=1`)  
- [ ] Distinct vehicle handling (arcade solid; Rapier PASS on `?driveProfile=1` + playtest — budgets coded, live PASS pending)  
- [x] Parked enter/exit + MP passengers + taken sync (claims + grace + door-side exit / chassis remount)  
- [x] Destructibles: material thresholds, debris reclaim, shared `db` break sync  
- [x] Ambient LOD by region (village ≪ city); traffic interest-host; peds/animals local  
- [x] Social toggles + convoys + denser meet plazas + plan persistence  
- [x] Apartments (enter/invite) + vibe-gated garage paints  
- [x] Atmosphere: wet roads, fog density, mist, lamp/headlight polish, rain bed  
- [x] Perf/net: physics LOD rings, interp defaults, interest/token-bucket, TURN ICE path, instance inventory  
- [x] Critical traffic/vehicle bugs: spawn FOV bands, LHT lane AI, F-enter nearby-first, bike wreck visibility, appear fade  
- [x] Phase 2 sim stability: junction Bezier aim, closing-speed follow, traffic tick LOD, ped FOV spawn, wreck claim/sync wire  
- [x] Phase 3 ambient life: signal-gated ped cross, dog chase, village ped bias, traffic yield to crossers, tyre grip compose, Rapier health drive  
- [x] Phase 4 validation: typecheck + full `check` + browser enter Novapura (IST HUD, F-enter scooter prompt, no runtime import break)  
- [~] Weather + IST; social meets; ~60 FPS desktop target (IST live in HUD; FPS varies by device — ~30 in automation, target desktop playtest)  
- [x] No ride-booking / summon gameplay (`phase4-acceptance` locks Digit/F paths)  

---

## Working rules

1. Do not rebuild the monorepo or replace arcade default.  
2. No fake “done” — ship behind flags until playtested.  
3. Prefer incremental PRs over mega-diffs.  
4. Static world = deterministic gen; ambient life = local/sim LOD; sync only social truth.  
