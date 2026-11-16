# Deploy OMMO to production (friends testing)

Two services are required. **Next.js alone cannot host multiplayer.**

| Service | Role | Host |
| --- | --- | --- |
| Next.js (`apps/web`) | Game UI + WebGL | **Vercel** |
| `server/relay.mjs` | Persistent WebSocket + `/stats` / `/plans` | **Fly.io** |

If the HUD says **This browser only**, the relay is unreachable — friends on other devices will not appear.

---

## CI/CD (push → production)

Pushing to **`main`** runs [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml):

1. Typecheck + unit tests + production build  
2. Deploy **relay** to Fly.io (`ommo-relay`)  
3. Deploy **web** to Vercel production  

PRs use [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (checks only).

### One-time GitHub setup

1. Push this repo to GitHub and enable Actions.
2. Add repository **secrets** (Settings → Secrets and variables → Actions):

| Secret | Source |
| --- | --- |
| `FLY_API_TOKEN` | Fly.io → Account → Access Tokens |
| `VERCEL_TOKEN` | Vercel → Account → Tokens |
| `VERCEL_ORG_ID` | After `vercel link`: `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Same file → `projectId` |

3. Create a GitHub Environment named **`production`** (optional protection rules).
4. In the Vercel project, set Production env: `NEXT_PUBLIC_RELAY_URL=wss://ommo-relay.fly.dev`, `RELAY_HTTP_URL=https://ommo-relay.fly.dev`.
5. **Disable** Vercel’s automatic Production Git deploy so only Actions publishes (avoid double deploys).
6. Ensure Fly app `ommo-relay` already exists (`fly apps create ommo-relay` once).

After that: merge/push to `main` → production updates automatically. Manual run: Actions → **Deploy Production** → Run workflow.

Details: [`.github/workflows/README.md`](../.github/workflows/README.md).

---

## Prerequisites

```bash
npm install
npm run prod:check          # typecheck + production build
# Install CLIs (once):
npm i -g vercel
curl -L https://fly.io/install.sh | sh
fly auth login
vercel login
```

---

## Order of operations

1. Deploy **relay** first (get a `wss://` URL).
2. Deploy **frontend** with that URL baked into `NEXT_PUBLIC_RELAY_URL`.
3. Lock relay `ALLOWED_ORIGINS` to your Vercel domain.
4. Run the friends checklist (two devices).

---

## 1. Relay on Fly.io

From the **repo root**:

```bash
# Create app once (rename if taken)
fly apps create ommo-relay

# Deploy from repo root (uses fly.relay.toml + server/Dockerfile)
fly deploy -c fly.relay.toml --ha=false
```


Confirm:

```bash
curl -s https://ommo-relay.fly.dev/health
# {"ok":true,"uptime":…,"rooms":[…],"sockets":0}

curl -s https://ommo-relay.fly.dev/stats | head
```

Your WebSocket URL is:

```text
wss://ommo-relay.fly.dev
```

(Fly terminates TLS; use **wss://** and **https://** for HTTP routes.)

### Relay env (Fly secrets)

```bash
# After you know the Vercel URL — lock origins (recommended):
fly secrets set ALLOWED_ORIGINS="https://YOUR-APP.vercel.app" -a ommo-relay

# Optional:
fly secrets set MAX_PER_ROOM="60" -a ommo-relay
```

| Var | Purpose |
| --- | --- |
| `PORT` | Set by Fly to match `internal_port` (8787) |
| `HOST` | Defaults to `0.0.0.0` |
| `MAX_PER_ROOM` | Cap per room (default 60) |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins; empty = allow all |

---

## 2. Frontend on Vercel

### Option A — Dashboard

1. Import this Git repo into Vercel.
2. **Root Directory:** leave as repository root (uses root `vercel.json`),  
   **or** set Root Directory to `apps/web` (uses `apps/web/vercel.json`, which `cd`s to the monorepo for install/build).
3. Framework: Next.js.
4. **Environment variables** (Production + Preview):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_RELAY_URL` | `wss://ommo-relay.fly.dev` |
| `RELAY_HTTP_URL` | `https://ommo-relay.fly.dev` |

5. Deploy. Open the HTTPS URL.

### Option B — CLI (from repo root)

```bash
vercel link
# If prompted for root directory, choose `.` (repo root) or `apps/web`
vercel env add NEXT_PUBLIC_RELAY_URL production   # paste wss://ommo-relay.fly.dev
vercel env add RELAY_HTTP_URL production          # paste https://ommo-relay.fly.dev
vercel --prod
```

Optional voice TURN (NAT):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_TURN_URLS` | `turn:…` (comma-separated) |
| `NEXT_PUBLIC_TURN_USERNAME` | … |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | … |

**Important:** Changing `NEXT_PUBLIC_*` requires a **rebuild** (redeploy).

After the Vercel URL is known, set Fly `ALLOWED_ORIGINS` (step 1) and redeploy is not required for secrets.

---

## 3. Local production parity

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_RELAY_URL=ws://localhost:8787
npm run prod:check
npm run relay &          # terminal 1
npm run start:prod       # terminal 2
# open http://localhost:3000
```

---

## 4. Friends test checklist

Do **not** invite a group until steps 8–12 pass on **two different browsers/devices**.

1. Frontend live on public HTTPS.
2. Relay `/health` returns 200; WSS reachable.
3. `NEXT_PUBLIC_RELAY_URL` is `wss://…` and the site was rebuilt after setting it.
4. Device A opens the game.
5. Create a player (name + look).
6. Enter; HUD shows **Live** (not “This browser only”).
7. Copy invite (or in-world **Invite to me** for `?join=`).
8. Device B opens the link — same city/world.
9. Walk near each other — remote avatars visible.
10. Shared vehicle (driver + passenger).
11. Drive a short distance together.
12. Chat + optional voice (`M`).
13. With `worldV1` on: travel toward another region without the menu.
14. No duplicate self / ghost peers.
15. Disconnect + reconnect — session sane.
16. Online counts match real peers (never invented).

---

## 5. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| “This browser only” | Missing/wrong `NEXT_PUBLIC_RELAY_URL`, used `ws://` on HTTPS, or relay down |
| Mixed-content / WS blocked | Must use `wss://` on HTTPS pages |
| 403 from relay | `ALLOWED_ORIGINS` does not include your Vercel origin |
| Join works, no remotes | Different city rooms / destination mismatch |
| Voice silent across NATs | Configure TURN env vars |
| Plans 404 after redeploy | Plans are in-memory; recreate after relay restart |
| Vercel build can’t find packages | Deploy from **repo root** (not `apps/web` alone) |

---

## 6. Quick reference

```bash
# Preferred: push to main (GitHub Actions → Fly + Vercel)
git push origin main

# Manual fallback
npm run prod:check
fly deploy -c fly.relay.toml --ha=false
vercel --prod
curl -s https://ommo-relay.fly.dev/health
```

See also: [`.github/workflows/README.md`](../.github/workflows/README.md) · [`.env.example`](../.env.example) · [`OMMO-ONE-WORLD-AUDIT.md`](./OMMO-ONE-WORLD-AUDIT.md)
