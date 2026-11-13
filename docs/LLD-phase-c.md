# LLD — Phase C (Sim cutover)

## Goal

When `?simCore=1`, **local foot + vehicle** transforms are authored by the Rapier sim worker snapshots. Arcade locomotion remains only as a **cold fallback** until the worker is ready (not deleted yet).

## Flags

| Flag | Behavior |
| --- | --- |
| `simCore` | Phase C — snapshot authority for foot + drive |
| `rapierDrive` | Phase B vehicles only (implied by `simCore`) |
| `shadowSim` | Off when either above is on |

## Modules

| File | Job |
| --- | --- |
| `flags.ts` | `isSimCoreEnabled` / implied rapier drive |
| `foot-authority.ts` | Foot enter/sync/step from char snapshot |
| `input/frame-intent.ts` | `simInputFromFootAxes` (cam-relative) |
| Existing `drive-authority` / `chunk-stream` | Reused |

## Flow

```
GameCanvas + simCore → warm worker + stream chunks
foot frame → footAuthority.step → apply LOCAL_DRIVER snapshot
drive frame → driveAuthority.step (unchanged)
dismount → exit vehicle + SYNC_LOCAL at kerb pose
```

## Worker

`SYNC_LOCAL` teleports the kinematic character (dismount / respawn / join).

## Constraints

- Thin hooks only in `PlayerController`.
- Soft 120 LOC per file.
- Passenger mode stays arcade (follows peer).
