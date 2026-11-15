/** Arterial shrubs, elevated metro, outer walls. */
import { between } from "../lib/rng.ts";
import type { GenBuffers } from "./gen-buffers.ts";
import type { CityData, Rect } from "./types.ts";

export function placeMedianShrubs(g: GenBuffers): void {
  const { rng, cfg, roadsX, roadsZ, xs, zs } = g;
  for (let i = 0; i <= cfg.cols; i += 1) {
    if (!roadsX[i].arterial) continue;
    for (let j = 0; j < cfg.rows; j += 1) {
      for (let z = zs[j] + roadsZ[j].half + 4; z < zs[j + 1] - roadsZ[j + 1].half - 3; z += 6.5) {
        g.shrubs.push({ x: xs[i], z, s: between(rng, 0.7, 1.2) });
      }
    }
  }
  for (let j = 0; j <= cfg.rows; j += 1) {
    if (!roadsZ[j].arterial) continue;
    for (let i = 0; i < cfg.cols; i += 1) {
      for (let x = xs[i] + roadsX[i].half + 4; x < xs[i + 1] - roadsX[i + 1].half - 3; x += 6.5) {
        g.shrubs.push({ x, z: zs[j], s: between(rng, 0.7, 1.2) });
      }
    }
  }
}

export function buildMetro(g: GenBuffers): {
  metroPillars: CityData["metroPillars"];
  metroSegments: CityData["metroSegments"];
  metroLine: CityData["metroLine"];
} {
  const { cfg, xs, zs, roadsX, roadsZ } = g;
  const metroPillars: CityData["metroPillars"] = [];
  const stations: CityData["metroSegments"] = [];
  const m = cfg.metro;
  const along = m.axis === "x" ? zs : xs;
  const alongRoads = m.axis === "x" ? roadsZ : roadsX;
  const fixed = m.axis === "x" ? xs[m.index] : zs[m.index];
  const count = m.axis === "x" ? cfg.rows : cfg.cols;
  for (let k = 0; k < count; k += 1) {
    const a0 = along[k] + alongRoads[k].half;
    const a1 = along[k + 1] - alongRoads[k + 1].half;
    const len = a1 - a0;
    const n = len > 62 ? 2 : 1;
    for (let p = 1; p <= n; p += 1) {
      const a = a0 + (len * p) / (n + 1);
      const px = m.axis === "x" ? fixed : a;
      const pz = m.axis === "x" ? a : fixed;
      metroPillars.push({ x: px, z: pz });
      g.circles.push({ x: px, z: pz, r: 0.85 });
    }
    if (k % 3 === 1) {
      const mid = (a0 + a1) / 2;
      stations.push({
        x0: m.axis === "x" ? fixed : mid - 22,
        z0: m.axis === "x" ? mid - 22 : fixed,
        x1: m.axis === "x" ? fixed : mid + 22,
        z1: m.axis === "x" ? mid + 22 : fixed,
        station: true,
      });
    }
  }
  const first = metroPillars[0];
  const last = metroPillars[metroPillars.length - 1];
  return {
    metroPillars,
    metroSegments: stations,
    metroLine: { x0: first.x, z0: first.z, x1: last.x, z1: last.z },
  };
}

export function pushOuterWalls(g: GenBuffers, bounds: Rect): void {
  const pad = 14;
  g.boxes.push(
    { minX: bounds.minX - 80, maxX: bounds.minX - pad, minZ: bounds.minZ - 80, maxZ: bounds.maxZ + 80, h: 0 },
    { minX: bounds.maxX + pad, maxX: bounds.maxX + 80, minZ: bounds.minZ - 80, maxZ: bounds.maxZ + 80, h: 0 },
    { minX: bounds.minX - 80, maxX: bounds.maxX + 80, minZ: bounds.minZ - 80, maxZ: bounds.minZ - pad, h: 0 },
    { minX: bounds.minX - 80, maxX: bounds.maxX + 80, minZ: bounds.maxZ + pad, maxZ: bounds.maxZ + 80, h: 0 },
  );
}
