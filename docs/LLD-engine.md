# LLD — `packages/engine`

## Responsibility

Own **simulation**: fixed-step world, characters, vehicles, chunk colliders, snapshot SoA. No React, no Three, no WebRTC.

## Coding rules

See `docs/ENGINEERING.md`: soft **120** / hard **150** LOC per file. One job per file.

## Module map

```
physics/
  protocol.ts            # Main↔Sim message types + SNAP layout
  math3.ts               # pure clamp / quat / yaw
  loop-state.ts          # accumulator buffer state
  vehicle-tuning.ts      # tuningFor + chassisHalfExtents
  vehicle-suspension.ts  # per-wheel rays + spring/friction
  vehicle-controller.ts  # RaycastVehicleController
  vehicle-step.ts        # tick vehicles + IMPACT
  character.ts           # CharState + stepCharacter
  chunks.ts              # load/unload AABB chunks
  snapshot.ts            # pack SNAPSHOT SoA
  sim-types.ts           # WorkerRuntime / stores types
  sim-spawn.ts           # spawn character / vehicle
  sim-vehicle-cmds.ts    # enter/exit/impulse/mirror/dispose
  sim-handlers.ts        # INIT + message switch
  world-loop.ts          # fixedUpdate + rAF accumulator
  sim-worker.ts          # thin onmessage entry (package)
  bridge-decode.ts       # Float32 → SnapshotEntity[]
  bridge.ts              # main-thread SimBridge API
input/
  unified.ts             # Intent ↔ SimInput
```

## Shadow integration (`src/game/sim/`)

| File | Job |
| --- | --- |
| `shadow-flag.ts` | `?shadowSim=1` / localStorage gate |
| `ids.ts` | ghost entity id constants |
| `feed-input.ts` | live/touch → `SimInput` |
| `shadow-session.ts` | `SimBridge` lifecycle + spawn auto |
| `sim.worker.ts` | Next-bundled worker entry |

UI: `ShadowSimGhost.tsx` binds ghost mesh; **does not** edit `PlayerController`.

## Snapshot SoA

`SNAP_STRIDE = 11`: `id, kind, x,y,z, qx,qy,qz,qw, speed, flags`

## Phase A contract

Arcade controller = authority. Shadow sim is observational + ghost mesh until Phase B flag cutover.
