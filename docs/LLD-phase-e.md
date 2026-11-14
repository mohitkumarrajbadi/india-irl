# LLD — Phase E (Social: voice 3D, hangouts, business card)

## Goal

When `?socialV2=1`:

1. Proximity voice uses **THREE.PositionalAudio** (HTML audio gain muted).
2. Meet plazas expose **hangout anchors** — press **E** near one to sit (chai pose) and join a voice priority zone.
3. **Business card** profiles live in IndexedDB; share selectively over relay `card` messages (P2P intent; no central profile DB).

## Flags

| Flag | Behavior |
| --- | --- |
| `socialV2` | Enables all three features above |

## Modules

| File | Job |
| --- | --- |
| `net/voice.ts` | Thin hook: `setPositionalSink` |
| `components/player/PositionalVoice.tsx` | Listener + PositionalAudio map |
| `world/anchors.ts` | Pure anchors from city meets |
| `game/social/hangout.ts` | Nearest / sit / leave / voice bias |
| `game/social/card-store.ts` | IndexedDB load/save |
| `game/social/card-wire.ts` | req / offer / deny over transport |
| `components/hud/BusinessCardPanel.tsx` | Edit + nearby share prompt |

## Voice priority

Seated players at the same / nearby anchor get distance treated as `d * 0.35` for link scoring (still capped at 6).

## Card wire

```
{ t: "card", to, op: "req"|"offer"|"deny", fields?: { linkedin, ig, wa, status } }
```

## Constraints

- Soft 120 LOC/file.
- Do not grow `PlayerController` beyond hangout trySit/leave hooks.
- Never upload cards by default.
