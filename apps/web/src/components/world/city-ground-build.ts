import * as THREE from "three";
import { QuadBatch } from "@/gfx/geo";
import { WALK } from "@/world/generate";
import type { CityData } from "@/world/types";

const TILE = 16;
/** Crossing depth (metres) — flush with the intersection pad edge. */
const ZEBRA = 2.8;
/** Stop-line thickness just before the zebra. */
const STOP = 0.35;

/** Build road / sidewalk / lot ground geometries for a city. */
export function buildCityGround(city: CityData) {
  const { xs, zs, roadsX, roadsZ, blocks, config } = city;
  const { cols, rows } = config;
  const minor = new QuadBatch();
  const art = new QuadBatch();
  const plain = new QuadBatch();
  const zebra = new QuadBatch();
  const marks = new QuadBatch();
  const paver = new QuadBatch();
  const lot = new QuadBatch();
  const grass = new QuadBatch();
  // Hair above collider Y=0 so asphalt doesn't z-fight the trimesh
  const Y = 0.015;

  // N–S road strips between junctions (u across width, v along length)
  for (let i = 0; i <= cols; i += 1) {
    const line = roadsX[i];
    const batch = line.arterial ? art : minor;
    for (let j = 0; j < rows; j += 1) {
      const z0 = zs[j] + roadsZ[j].half;
      const z1 = zs[j + 1] - roadsZ[j + 1].half;
      if (z1 - z0 < 0.5) continue;
      batch.quad(line.c - line.half, z0, line.c + line.half, z1, Y, {
        u0: 0,
        u1: 1,
        v0: z0 / TILE,
        v1: z1 / TILE,
      });
    }
  }
  // E–W road strips between junctions
  for (let j = 0; j <= rows; j += 1) {
    const line = roadsZ[j];
    const batch = line.arterial ? art : minor;
    for (let i = 0; i < cols; i += 1) {
      const x0 = xs[i] + roadsX[i].half;
      const x1 = xs[i + 1] - roadsX[i + 1].half;
      if (x1 - x0 < 0.5) continue;
      batch.quad(x0, line.c - line.half, x1, line.c + line.half, Y, {
        u0: 0,
        u1: 1,
        v0: x0 / TILE,
        v1: x1 / TILE,
        swap: true,
      });
    }
  }

  paintCrossings(city, plain, zebra, marks, Y);
  paintBlocks(city, paver, lot, grass);

  return {
    minor: minor.build(),
    art: art.build(),
    plain: plain.build(),
    zebra: zebra.build(),
    marks: marks.build(),
    paver: paver.build(),
    lot: lot.build(),
    grass: grass.build(),
  };
}

function paintCrossings(
  city: CityData,
  plain: QuadBatch,
  zebra: QuadBatch,
  marks: QuadBatch,
  Y: number,
): void {
  const { xs, zs, roadsX, roadsZ, config } = city;
  const { cols, rows } = config;
  const zY = Y + 0.006;
  const mY = Y + 0.005;

  const stripes = (x0: number, z0: number, x1: number, z1: number, alongX: boolean) => {
    const span = alongX ? x1 - x0 : z1 - z0;
    if (span < 0.4) return;
    zebra.quad(x0, z0, x1, z1, zY, {
      u0: 0,
      u1: span / 14,
      v0: 0,
      v1: 1,
      swap: !alongX,
    });
  };

  const stop = (x0: number, z0: number, x1: number, z1: number) => {
    if (x1 - x0 < 0.3 || z1 - z0 < 0.05) return;
    marks.quad(x0, z0, x1, z1, mY, { u0: 0, u1: 1, v0: 0, v1: 1 });
  };

  for (let i = 0; i <= cols; i += 1) {
    for (let j = 0; j <= rows; j += 1) {
      const hx = roadsX[i].half;
      const hz = roadsZ[j].half;
      const cx = xs[i];
      const cz = zs[j];
      // Intersection pad — flush with approach strip ends
      plain.quad(cx - hx, cz - hz, cx + hx, cz + hz, Y, {
        u0: (cx - hx) / 8,
        u1: (cx + hx) / 8,
        v0: (cz - hz) / 8,
        v1: (cz + hz) / 8,
      });

      // Median half-gap so zebra doesn't paint through the median
      const medX = roadsX[i].arterial ? roadsX[i].median * 0.5 + 0.15 : 0;
      const medZ = roadsZ[j].arterial ? roadsZ[j].median * 0.5 + 0.15 : 0;
      const edge = 0.35; // keep clear of curb

      const crossX = (z0: number, z1: number, stopZ0: number, stopZ1: number) => {
        if (roadsX[i].arterial && medX > 0) {
          stripes(cx - hx + edge, z0, cx - medX, z1, true);
          stripes(cx + medX, z0, cx + hx - edge, z1, true);
          stop(cx - hx + edge, stopZ0, cx - medX, stopZ1);
          stop(cx + medX, stopZ0, cx + hx - edge, stopZ1);
        } else {
          stripes(cx - hx + edge, z0, cx + hx - edge, z1, true);
          stop(cx - hx + edge, stopZ0, cx + hx - edge, stopZ1);
        }
      };
      const crossZ = (x0: number, x1: number, stopX0: number, stopX1: number) => {
        if (roadsZ[j].arterial && medZ > 0) {
          stripes(x0, cz - hz + edge, x1, cz - medZ, false);
          stripes(x0, cz + medZ, x1, cz + hz - edge, false);
          stop(stopX0, cz - hz + edge, stopX1, cz - medZ);
          stop(stopX0, cz + medZ, stopX1, cz + hz - edge);
        } else {
          stripes(x0, cz - hz + edge, x1, cz + hz - edge, false);
          stop(stopX0, cz - hz + edge, stopX1, cz + hz - edge);
        }
      };

      // North approach
      if (j < rows) {
        crossX(cz + hz, cz + hz + ZEBRA, cz + hz - STOP, cz + hz);
      }
      // South approach
      if (j > 0) {
        crossX(cz - hz - ZEBRA, cz - hz, cz - hz, cz - hz + STOP);
      }
      // East approach
      if (i < cols) {
        crossZ(cx + hx, cx + hx + ZEBRA, cx + hx - STOP, cx + hx);
      }
      // West approach
      if (i > 0) {
        crossZ(cx - hx - ZEBRA, cx - hx, cx - hx, cx - hx + STOP);
      }
    }
  }
}

function paintBlocks(city: CityData, paver: QuadBatch, lot: QuadBatch, grass: QuadBatch): void {
  const SY = 0.055;
  const ring = new THREE.Color(city.config.palette.paver);
  const dirt = new THREE.Color(city.config.palette.paver).multiplyScalar(0.8);
  const plaza = new THREE.Color(city.config.palette.paver).multiplyScalar(1.08);
  const green = new THREE.Color("#5d8a3e");
  const curb = new THREE.Color(city.config.palette.paver).multiplyScalar(0.72);
  for (const b of city.blocks) {
    const q = (x0: number, z0: number, x1: number, z1: number, batch: QuadBatch, color: THREE.Color) =>
      batch.quad(x0, z0, x1, z1, SY, { u0: x0 / 4, u1: x1 / 4, v0: z0 / 4, v1: z1 / 4 }, color);
    const { minX, maxX, minZ, maxZ } = b;
    // Sidewalk ring flush with the road outer edge
    q(minX, minZ, maxX, minZ + WALK, paver, ring);
    q(minX, maxZ - WALK, maxX, maxZ, paver, ring);
    q(minX, minZ + WALK, minX + WALK, maxZ - WALK, paver, ring);
    q(maxX - WALK, minZ + WALK, maxX, maxZ - WALK, paver, ring);
    // Dark curb lip along the carriageway (reads as a clean road/sidewalk seam)
    const C = 0.18;
    q(minX, minZ, maxX, minZ + C, paver, curb);
    q(minX, maxZ - C, maxX, maxZ, paver, curb);
    q(minX, minZ + C, minX + C, maxZ - C, paver, curb);
    q(maxX - C, minZ + C, maxX, maxZ - C, paver, curb);
    if (b.kind === "lake") continue;
    const inner = [minX + WALK, minZ + WALK, maxX - WALK, maxZ - WALK] as const;
    if (b.fringe) {
      // Village / field fringe — patchwork green + dirt
      const field = new THREE.Color("#5f8a3a");
      const soil = new THREE.Color("#8a6a40");
      q(...inner, grass, field);
      const mx = (minX + maxX) * 0.5;
      const mz = (minZ + maxZ) * 0.5;
      q(mx - 3, minZ + WALK, mx + 3, maxZ - WALK, lot, soil);
      q(minX + WALK, mz - 2.2, maxX - WALK, mz + 2.2, lot, soil);
    } else if (b.kind === "park") q(...inner, grass, green);
    else if (b.kind === "landmark") q(...inner, paver, plaza);
    else q(...inner, lot, dirt);
  }
}
