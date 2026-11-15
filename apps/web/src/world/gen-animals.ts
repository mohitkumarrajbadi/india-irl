/** Cows / dogs / goats — cows lean village/fringe; dogs stay urban; quiet hills. */
import { between, pick } from "../lib/rng.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import { blockEdges } from "./gen-edges.ts";

export function spawnAnimals(g: GenBuffers): void {
  const { rng, cfg, blocks, roadsX, roadsZ } = g;

  // Fewer urban cows — trail life adds the village herd
  const urbanCows = Math.max(1, Math.floor(cfg.cows * 0.35));
  for (let i = 0; i < urbanCows; i += 1) {
    const pool = blocks.filter((b) => b.kind === "market" || b.kind === "old" || b.fringe);
    const b = pool.length > 0 ? pick(rng, pool) : blocks[0]!;
    const e = pick(rng, blockEdges(b, roadsX, roadsZ, 3.2));
    const s = e.len * between(rng, 0.2, 0.8);
    const x = e.x + e.ax * s;
    const z = e.z + e.az * s;
    g.cows.push({ x, z, rot: between(rng, 0, Math.PI * 2), s: between(rng, 0.9, 1.1), v: Math.floor(rng() * 3) });
    g.circles.push({ x, z, r: 0.9 });
  }

  // Dogs: urban only — avoid fringe / park packs that feel like “stray spam”
  const dogN = Math.max(2, Math.floor(cfg.dogs * 0.55));
  for (let i = 0; i < dogN; i += 1) {
    const id = cfg.id;
    const pool = blocks.filter((b) => {
      if (b.fringe) return false;
      if (id === "bengaluru" || id === "gurugram") return b.kind === "tech" || b.kind === "cbd" || b.kind === "market";
      if (id === "pune") return b.kind === "resi" || b.kind === "market" || b.kind === "old";
      return b.kind === "market" || b.kind === "old" || b.kind === "cbd";
    });
    const b = pool.length > 0 ? pick(rng, pool) : blocks[0]!;
    const e = pick(rng, blockEdges(b, roadsX, roadsZ, 2.0));
    const s = e.len * between(rng, 0.15, 0.85);
    const x = e.x + e.ax * s + e.ox * between(rng, 0.2, 0.8);
    const z = e.z + e.az * s + e.oz * between(rng, 0.2, 0.8);
    g.strays.push({ x, z, rot: between(rng, 0, Math.PI * 2), s: between(rng, 0.85, 1.15), v: Math.floor(rng() * 4), kind: 0 });
    g.circles.push({ x, z, r: 0.35 });
  }

  // Goats: fringe / old / market — village-adjacent, not hill packs
  const goatN = Math.max(1, cfg.goats);
  for (let i = 0; i < goatN; i += 1) {
    const pool = blocks.filter((b) => b.fringe || b.kind === "old" || b.kind === "market");
    const b = pool.length > 0 ? pick(rng, pool) : blocks[0]!;
    const e = pick(rng, blockEdges(b, roadsX, roadsZ, 2.4));
    const s = e.len * between(rng, 0.2, 0.8);
    const x = e.x + e.ax * s + e.ox * 0.5;
    const z = e.z + e.az * s + e.oz * 0.5;
    g.strays.push({ x, z, rot: between(rng, 0, Math.PI * 2), s: between(rng, 0.9, 1.2), v: Math.floor(rng() * 3), kind: 1 });
    g.circles.push({ x, z, r: 0.4 });
  }
}
