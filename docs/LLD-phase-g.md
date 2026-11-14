# LLD — Phase G (Monorepo: apps/web + workspaces)

## Goal

Ship the Next/R3F client from `apps/web` with npm workspaces; packages stay under `packages/*`. Fullscreen already lives in the HUD (Phase F).

## Layout

```
apps/web/          Next.js app (src, public, next.config)
packages/engine/   Rapier sim worker
packages/network/  Pose codec / Hermite
packages/mods/     Declarative manifests
packages/shared/   Tick / VK constants
server/            Relay (root)
```

## Root

- `package.json` → `"workspaces": ["apps/*", "packages/*"]`
- `npm run dev` → relay + `apps/web` Next
- `npm run check` → node strip-types tests (paths under `apps/web` + `packages`)

## Constraints

- Do not invent new UI packages.
- Keep `@/*` alias local to `apps/web`.
- `transpilePackages` includes `@india-irl/*`.
