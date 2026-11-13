# LLD — Phase D (Net v2)

## Goal

When `?netV2=1`, poses use a **binary codec**, remotes use **Hermite** interpolation, and encode/decode runs on a **Net Worker**. The city **relay stays** for discovery, join, chat, voice signaling, and fan-out.

## Flags

| Flag | Behavior |
| --- | --- |
| `netV2` | Binary `sb` wire + Hermite sample + codec worker |

## Wire

- Legacy: `{ t: "s", p: [x,z,yaw,speed,veh,seat,emote,ride] }`
- v2: `{ t: "sb", b: "<base64>" }` — fixed binary pose (see `pose-codec.ts`)

Relay validates `sb`, updates spatial meta from decoded x/z, fans out like `s`.

## Modules

| File | Job |
| --- | --- |
| `packages/network/.../pose-codec.ts` | encode / decode ArrayBuffer |
| `packages/network/.../sample-remote.ts` | Hermite + yaw wrap |
| `src/net/net.worker.ts` | ENCODE / DECODE messages |
| `src/net/net-codec.ts` | Main-thread bridge to worker |
| `src/net/interp.ts` | Dispatches Hermite when `netV2` |

## Flow

```
sendState → netCodec.encode → transport { t:"sb", b }
onMessage sb → netCodec.decode → peer.snaps.push
RemotePlayers → samplePeer → Hermite when netV2
```

## Constraints

- Soft 120 LOC/file.
- Do not move WebSocket into the worker in this phase (relay stays on main).
- Fallback: if worker missing, encode/decode sync on main.
