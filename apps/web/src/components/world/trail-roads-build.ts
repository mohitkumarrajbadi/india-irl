/** Ribbon meshes for village / hill trails following terrain height. */
import * as THREE from "three";
import { heightAt } from "@/world/terrain-sample";
import type { CityData, TrailRoad } from "@/world/types";

function appendRibbon(
  pos: number[],
  uv: number[],
  col: number[],
  idx: number[],
  city: CityData,
  trail: TrailRoad,
  color: THREE.Color,
  yBias: number,
): void {
  const pts = trail.points;
  if (pts.length < 2) return;
  const half = trail.half;
  let v0 = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = (-dz / len) * half;
    const pz = (dx / len) * half;
    const y0 = heightAt(city, a.x, a.z) + yBias;
    const y1 = heightAt(city, b.x, b.z) + yBias;
    // Corner heights follow terrain at the edges so the ribbon sits on the apron
    const y0l = heightAt(city, a.x + px, a.z + pz) + yBias;
    const y0r = heightAt(city, a.x - px, a.z - pz) + yBias;
    const y1l = heightAt(city, b.x + px, b.z + pz) + yBias;
    const y1r = heightAt(city, b.x - px, b.z - pz) + yBias;
    const base = pos.length / 3;
    // Prefer center height for drivability, blend edges slightly
    const yaL = y0 * 0.65 + y0l * 0.35;
    const yaR = y0 * 0.65 + y0r * 0.35;
    const ybL = y1 * 0.65 + y1l * 0.35;
    const ybR = y1 * 0.65 + y1r * 0.35;
    pos.push(
      a.x + px, yaL, a.z + pz,
      a.x - px, yaR, a.z - pz,
      b.x - px, ybR, b.z - pz,
      b.x + px, ybL, b.z + pz,
    );
    const v1 = v0 + len / 8;
    uv.push(0, v0, 1, v0, 1, v1, 0, v1);
    v0 = v1;
    for (let k = 0; k < 4; k += 1) col.push(color.r, color.g, color.b);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

function buildKind(city: CityData, kind: TrailRoad["kind"], color: THREE.Color): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const bias = kind === "hill" ? 0.06 : 0.04;
  for (const t of city.trails) {
    if (t.kind !== kind) continue;
    appendRibbon(pos, uv, col, idx, city, t, color, bias);
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
    village: buildKind(city, "village", new THREE.Color("#7a5a38")),
    hill: buildKind(city, "hill", new THREE.Color("#4a4a4e")),
  };
}
