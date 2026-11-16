# Deploy OMMO for friends testing

Two services are required. Next.js alone cannot host multiplayer.

| Service | Role | Suggested host |
| --- | --- | --- |
| Next.js (`apps/web`) | Game UI + WebGL client | Vercel |
| `server/relay.mjs` | Persistent WebSocket rooms + `/stats` / `/plans` | Fly.io |

Same-browser `BroadcastChannel` fallback is **not** cross-device multiplayer. If the HUD says “This browser only”, the relay is unreachable.

---

## 1. Relay on Fly.io

From the repo root:

```bash
# once
fly apps create ommo-relay   # pick a free name if taken
fly secrets set ALLOWED_ORIGINS="https://YOUR-VERCEL-APP.vercel.app"
# Build context is server/ (Dockerfile + relay sources live there).
fly deploy -c server/fly.toml --ha=false
```


Confirm:

```bash
curl https://ommo-relay.fly.dev/health
curl https://ommo-relay.fly.dev/stats
```

Note the `wss://` URL (Fly terminates TLS). Example: `wss://ommo-relay.fly.dev`.

Env vars (see `.env.example`):

| Var | Purpose |
| --- | --- |
| `PORT` | Listen port (Fly sets this; default 8787 locally) |
| `MAX_PER_ROOM` | Cap per room (default 60) |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |

---

## 2. Frontend on Vercel

1. Import the GitHub/Origin repo into Vercel.
2. Root directory: repo root (workspace). Build: `npm run build`. Start is unused on Vercel (Next).
3. Set env **before** build:

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_RELAY_URL` | `wss://ommo-relay.fly.dev` |
| `RELAY_HTTP_URL` | `https://ommo-relay.fly.dev` (OG `/stats`) |

4. Deploy. Open the public URL over HTTPS.

Optional voice TURN: `NEXT_PUBLIC_TURN_URLS`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL`.

---

## 3. Local production parity

```bash
cp .env.example .env.local
# edit NEXT_PUBLIC_RELAY_URL if needed
npm run build
npm run relay &   # terminal 1
npm start         # terminal 2 — Next only
```

---

## 4. Friends test checklist

Do **not** mark ready until steps 8–12 pass on **two different browsers/devices**.

1. Deploy frontend (public HTTPS URL).
2. Deploy relay (public WSS + `/health` 200).
3. Confirm `NEXT_PUBLIC_RELAY_URL` points at that WSS (rebuild if changed).
4. Open the game URL on device A.
5. Create a player (name + look).
6. Enter a city / destination; HUD must show **Live**, not “This browser only”.
7. Copy invite (or in-world **Invite to me** for `?join=`).
8. Open the link on device B; both join the **same** city/world.
9. Walk near each other — remote avatars visible.
10. Enter the same vehicle (driver + passenger).
11. Drive together a short distance.
12. Chat + optional proximity voice (`M`).
13. Travel toward another region (once `worldV1` is on) without returning to the menu.
14. Confirm multiplayer continuity (no duplicate self).
15. Disconnect device A; reconnect; position/session sane.
16. Confirm counts on menu/HUD match real peers (never invent numbers).

---

## 5. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| “This browser only” | Wrong/missing `NEXT_PUBLIC_RELAY_URL`, mixed content, or relay down |
| Join works, no remote bodies | Different city rooms / destination mismatch |
| Voice silent across NATs | Need TURN env vars |
| Plans 404 after redeploy | Plans are in-memory; recreate after relay restart |
