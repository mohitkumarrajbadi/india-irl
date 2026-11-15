import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { ARTERIAL_WIDTH, MEDIAN } from "../world/gen-constants";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d") as CanvasRenderingContext2D];
}

function finish(c: HTMLCanvasElement, repeat: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

function asphalt(ctx: CanvasRenderingContext2D, w: number, h: number, base = "#3a3e44"): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(7);
  for (let i = 0; i < w * h * 0.35; i += 1) {
    const g = 40 + Math.floor(rng() * 50);
    ctx.fillStyle = `rgba(${g},${g},${g + 4},${0.18 + rng() * 0.25})`;
    ctx.fillRect(rng() * w, rng() * h, 1.4, 1.4);
  }
  // Tyre-wear bands (outer + inner lanes)
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(w * 0.12, 0, w * 0.1, h);
  ctx.fillRect(w * 0.78, 0, w * 0.1, h);
  ctx.fillRect(w * 0.32, 0, w * 0.08, h);
  ctx.fillRect(w * 0.6, 0, w * 0.08, h);
}

/** Tile is 16 m long (v) and as wide as the road (u). */
export function roadTexture(kind: "minor" | "arterial" | "plain"): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  asphalt(ctx, W, H);
  const dash = (u: number, wPx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(u * W - wPx / 2, 0, wPx, H * 0.3);
    ctx.fillRect(u * W - wPx / 2, H * 0.5, wPx, H * 0.3);
  };
  const solid = (u: number, wPx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(u * W - wPx / 2, 0, wPx, H);
  };
  if (kind === "minor") {
    // 9 m: centre dash + edge lines
    dash(0.5, 5, "#e9e4d0");
    solid(0.04, 4, "#d8d3c0");
    solid(0.96, 4, "#d8d3c0");
  } else if (kind === "arterial") {
    // Lane centres at ±2.7 / ±6.1 → divider dashes midway between them (±4.4)
    const medW = MEDIAN / ARTERIAL_WIDTH;
    const midLane = (2.7 + 6.1) / 2 / ARTERIAL_WIDTH;
    ctx.fillStyle = "#7a7568";
    ctx.fillRect(W * (0.5 - medW / 2), 0, W * medW, H);
    ctx.fillStyle = "#f2c230";
    ctx.fillRect(W * (0.5 - medW / 2) - 2, 0, 3, H);
    ctx.fillRect(W * (0.5 + medW / 2) - 1, 0, 3, H);
    dash(0.5 - midLane, 4, "#e9e4d0");
    dash(0.5 + midLane, 4, "#e9e4d0");
    solid(0.025, 4, "#e9e4d0");
    solid(0.975, 4, "#e9e4d0");
  }
  return finish(c, true);
}

export function zebraTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 64);
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "#ece8d8";
  for (let i = 0; i < 16; i += 1) ctx.fillRect(i * 16 + 2, 4, 11, 56);
  return finish(c, true);
}

export function paverTexture(base: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  const rng = mulberry32(11);
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = `rgba(${rng() > 0.5 ? 255 : 0},${rng() > 0.5 ? 255 : 0},0,0.035)`;
    ctx.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  return finish(c, true);
}
