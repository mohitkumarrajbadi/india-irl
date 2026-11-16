/**
 * Terrain-following trail ribbons: smoothed elevation, soft shoulders,
 * hill guardrail posts. Village = worn asphalt/dirt; hill = mountain asphalt.
 */
import * as THREE from "three";
import { heightAt } from "@/world/terrain-sample";
import type { CityData, TrailRoad } from "@/world/types";

function smoothHeights(raw: number[]): number[] {
  if (raw.length < 3) return raw.slice();
  const out = raw.slice();
  for (let pass = 0; pass < 2; pass += 1) {
    const next = out.slice();
    for (let i = 1; i < out.length - 1; i += 1) {
      next[i] = out[i - 1]! * 0.25 + out[i]! * 0.5 + out[i + 1]! * 0.25;
    }
    for (let i = 0; i < out.length; i += 1) out[i] = next[i]!;
  }
  return out;
}

function appendRibbon(
  pos: number[],
  uv: number[],
  col: number[],
  idx: number[],
  city: CityData,
  trail: TrailRoad,
  color: THREE.Color,
  yBias: number,
  bank: boolean,
): void {
  const pts = trail.points;
  if (pts.length < 2) return;
  const rawY = pts.map((p) => heightAt(city, p.x, p.z));
  const ys = smoothHeights(rawY);
  const half = trail.half;
  let v0 = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    // Bank outer edge slightly on hill bends
    let bankL = 0;
    let bankR = 0;
    if (bank && i > 0 && i < pts.length - 2) {
      const c = pts[i + 2]!;
      const cross = dx * (c.z - b.z) - dz * (c.x - b.x);
      const k = Math.max(-1, Math.min(1, cross / (len * len + 1))) * 0.35;
      bankL = k;
      bankR = -k;
    }
    const y0 = ys[i]! + yBias;
    const y1 = ys[i + 1]! + yBias;
    const base = pos.length / 3;
    pos.push(
      a.x + nx * half, y0 + bankL, a.z + nz * half,
      a.x - nx * half, y0 + bankR, a.z - nz * half,
      b.x - nx * half, y1 + bankR, b.z - nz * half,
      b.x + nx * half, y1 + bankL, b.z + nz * half,
    );
    const v1 = v0 + len / 8;
    uv.push(0, v0, 1, v0, 1, v1, 0, v1);
    v0 = v1;
    // Slight color variation for worn village patches
    const shade = trail.kind === "village" && i % 5 === 2 ? 0.85 : 1;
    for (let k = 0; k < 4; k += 1) col.push(color.r * shade, color.g * shade, color.b * shade);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

/** Low guardrail quads on the outer side of hill roads (+ posts on bends). */
function appendRails(
  pos: number[],
  uv: number[],
  col: number[],
  idx: number[],
  city: CityData,
  trail: TrailRoad,
): void {
  if (trail.kind !== "hill") return;
  const rail = new THREE.Color("#8a9098");
  const pts = trail.points;
  const ys = smoothHeights(pts.map((p) => heightAt(city, p.x, p.z)));
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const d = trail.half + 0.35;
    const y0 = ys[i]! + 0.55;
    const y1 = ys[i + 1]! + 0.55;
    const base = pos.length / 3;
    const h = 0.55;
    pos.push(
      a.x + nx * d, y0, a.z + nz * d,
      a.x + nx * d, y0 + h, a.z + nz * d,
      b.x + nx * d, y1 + h, b.z + nz * d,
      b.x + nx * d, y1, b.z + nz * d,
    );
    uv.push(0, 0, 0, 1, 1, 1, 1, 0);
    for (let k = 0; k < 4; k += 1) col.push(rail.r, rail.g, rail.b);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function buildKind(city: CityData, kind: TrailRoad["kind"], color: THREE.Color): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const bias = kind === "hill" ? 0.08 : 0.05;
  for (const t of city.trails) {
    if (t.kind !== kind) continue;
    appendRibbon(pos, uv, col, idx, city, t, color, bias, kind === "hill");
    if (kind === "hill") appendRails(pos, uv, col, idx, city, t);
  }
  const g = new THREE.BufferGeometry();
  if (pos.length === 0) {
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 1, 1, 0, 0], 3));
    g.setIndex([0, 1, 2]);
    return g;
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function buildTrailRoadGeos(city: CityData) {
  return {
    village: buildKind(city, "village", new THREE.Color("#6a5a42")),
    hill: buildKind(city, "hill", new THREE.Color("#3a3c42")),
  };
}
