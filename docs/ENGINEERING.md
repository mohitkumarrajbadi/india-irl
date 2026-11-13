# Engineering Standards — India IRL

## Goals

Code must be **reviewable in one screen**, **testable in isolation**, and **named by responsibility**. Prefer many small modules over a few god files.

## Hard limits

| Rule | Limit |
| --- | --- |
| Soft max lines per `.ts` / `.tsx` file | **120** |
| Hard max (split required before merge) | **150** |
| Functions | One job; prefer **≤40** lines |
| React components | One concern; extract hooks / systems when logic > UI |
| `any` | Forbidden in engine/network packages |
| Side effects | At edges only (workers, I/O, React mounts) |

Existing debt (`PlayerController.tsx` ~1200 LOC) is **quarantined**: do not add features there. Extract sideways into `src/game/` or `packages/*` instead.

## Layering (dependency direction)

```
apps/web (UI, R3F bind)
    ↓
packages/network  packages/mods
    ↓
packages/engine
    ↓
packages/shared
```

- `shared` has **zero** imports from other packages.
- `engine` never imports React / Three / DOM.
- `network` never imports Rapier / Three scene graph.
- Workers import only worker-safe modules.

## Naming

| Kind | Pattern | Example |
| --- | --- | --- |
| Types / protocols | nouns | `SimInput`, `PoseSample` |
| Pure transforms | verbs | `intentToSimInput`, `hermitePose` |
| Stateful services | `*Controller`, `*Bridge`, `*Store` | `SimBridge` |
| Systems (ECS / tick) | `*System` or `step*` | `stepCharacter` |
| Tunables | `*Tuning`, consts UPPER_SNAKE for thresholds | `IMPACT_SPEED` |

## Documentation map

| Doc | Scope |
| --- | --- |
| `docs/TDD.md` | Product / system HLD (threads, open-core, roadmap) |
| `docs/HLD.md` | Module graph, data flow, ownership |
| `docs/LLD-engine.md` | Engine package class/file contracts |
| `docs/ENGINEERING.md` | This file — coding rules |

## Change checklist

1. Does this change belong in an existing small module?
2. Will any file exceed 150 LOC after the change? → split first.
3. Is the public API exported from the package `index.ts` intentionally?
4. Can a new reader find the “one job” of this file from its name alone?
