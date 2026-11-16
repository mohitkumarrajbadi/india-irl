# GitHub Actions

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | PRs + pushes to non-`main` | Typecheck + unit tests |
| `deploy-production.yml` | Push to `main` (or manual) | Gate → Fly relay + Vercel production |

## Required secrets

Repo → **Settings → Secrets and variables → Actions**

| Secret | How to get it |
| --- | --- |
| `FLY_API_TOKEN` | [Fly dashboard → Account → Access Tokens](https://fly.io/dashboard/personal/tokens) |
| `VERCEL_TOKEN` | [Vercel → Account → Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | From `.vercel/project.json` after `vercel link`, or Vercel project settings |
| `VERCEL_PROJECT_ID` | Same as above |

Optional **Variables** (Actions → Variables):

| Variable | Default if unset |
| --- | --- |
| `NEXT_PUBLIC_RELAY_URL` | `wss://ommo-relay.fly.dev` |
| `RELAY_HTTP_URL` | `https://ommo-relay.fly.dev` |

Also create a GitHub **Environment** named `production` (Settings → Environments) so deploy jobs can use environment protection rules if you want.

## Vercel dashboard

Turn **off** Vercel’s automatic Git deploys for Production if you use this workflow — otherwise every push deploys twice. Keep Production env vars (`NEXT_PUBLIC_RELAY_URL`, `RELAY_HTTP_URL`) set in the Vercel project; `vercel pull` loads them for the build.
