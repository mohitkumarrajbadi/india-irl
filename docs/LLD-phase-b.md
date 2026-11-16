# LLD — Phase B (Rapier vehicles, arcade foot)

## Goal

When `?rapierDrive=1` (or localStorage), **drive mode** integrates via the sim worker. **Foot / passenger** stay on the arcade path in `PlayerController`.

## Flags

| Flag | Behavior |
| --- | --- |
| `rapierDrive` | Phase B — authoritative Rapier chassis for local driver |
| `shadowSim` | Phase A ghost only; ignored if `rapierDrive` is on |

## Modules (`src/game/sim` + `src/game/input`)

| File | Job |
| --- | --- |
| `flags.ts` | Shared query/localStorage gate |
| `drive-ids.ts` | Stable local vehicle entity id |
| `pose-from-snap.ts` | Snapshot entity → x/z/yaw/speed/roll |
| `drive-session.ts` | SimBridge singleton, spawn/sync/exit, IMPACT |
| `drive-authority.ts` | `enter` / `exit` / `step` + chunk sync |
| `drive-impact.ts` | One-shot IMPACT → arcade crash feedback |
| `chunk-cell.ts` | 64 m cell math + 9-neighborhood |
| `chunk-pack.ts` | City AABB/circle → Rapier box SoA |
| `chunk-stream.ts` | Load/unload resident cells on bridge |
| `input/frame-intent.ts` | Frame axes → `SimInput` (brake/boost) |

## Flow

```
GameCanvas mount (flag on) → ensureDriveWorker (warm)
enter / remount   → driveAuthority.enter(kind, pose)
useFrame drive    → syncWorldChunks → setInput → apply snapshot
                  → takeDriveImpact → applyCrashHit (optional)
                  → skip arcade grid.resolve when chunks resident
dismount / eject  → driveAuthority.exit()
unmount city      → disposeDriveSession()
```

If worker not ready or kind not in allow-list → fall back to `stepDrive`.

## Polish notes

- Snapshot vehicle speed is **signed** (forward axis).
- Opposite stick while moving = brake; Space = handbrake; Sprint = full throttle.
- World colliders: 9-cell stream from `city.boxes` / `city.circles`.

## Allow-list

All player vehicles: auto (1), scooter (2), cab (3).

## Drive profiler

| Flag | Behavior |
| --- | --- |
| `driveProfile` | HUD line: authority · mean/p95 ms · fallback% · chunk count · PASS/HOLD |

Budgets in `drive-profile.ts` (`DRIVE_BUDGET`): Rapier p95 ≤ 2.8 ms, fallback ≤ 8%, ≥ 45 samples. Arcade stays default until a sustained **PASS**.

## Constraints

- Do not grow `PlayerController` beyond thin hooks.
- Soft 120 LOC per new file.
