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
  t.magFilter = THREE.LinearFilter;
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
  // Fine grain — avoids large bright speckles that mip into white patches
  for (let i = 0; i < w * h * 0.22; i += 1) {
    const g = 42 + Math.floor(rng() * 28);
    ctx.fillStyle = `rgba(${g},${g},${g + 3},${0.1 + rng() * 0.16})`;
    ctx.fillRect(rng() * w, rng() * h, 1.1, 1.1);
  }
  // Soft blotches for natural asphalt variation (low contrast)
  for (let i = 0; i < 48; i += 1) {
    const g = 36 + Math.floor(rng() * 22);
    ctx.fillStyle = `rgba(${g},${g},${g + 2},${0.04 + rng() * 0.06})`;
    const bw = 8 + rng() * 28;
    const bh = 10 + rng() * 36;
    ctx.fillRect(rng() * w, rng() * h, bw, bh);
  }
  // Tyre-wear bands (outer + inner lanes) — subtle, not bright
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
  asphalt(ctx, W, H, kind === "plain" ? "#383c42" : "#3a3e44");
  const dash = (u: number, wPx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(u * W - wPx / 2, 0, wPx, H * 0.28);
    ctx.fillRect(u * W - wPx / 2, H * 0.5, wPx, H * 0.28);
  };
  const solid = (u: number, wPx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(u * W - wPx / 2, 0, wPx, H);
  };
  // Markings: dusty warm-grey — bright edges read as white slabs under dusk specular
  const mark = "#9e9788";
  const edge = "#8f8878";
  if (kind === "minor") {
    dash(0.5, 4, mark);
    solid(0.04, 3, edge);
    solid(0.96, 3, edge);
  } else if (kind === "arterial") {
    const medW = MEDIAN / ARTERIAL_WIDTH;
    const midLane = (2.7 + 6.1) / 2 / ARTERIAL_WIDTH;
    ctx.fillStyle = "#6a6558";
    ctx.fillRect(W * (0.5 - medW / 2), 0, W * medW, H);
    ctx.fillStyle = "#d4a82a";
    ctx.fillRect(W * (0.5 - medW / 2) - 2, 0, 3, H);
    ctx.fillRect(W * (0.5 + medW / 2) - 1, 0, 3, H);
    dash(0.5 - midLane, 3, mark);
    dash(0.5 + midLane, 3, mark);
    solid(0.025, 3, edge);
    solid(0.975, 3, edge);
  }
  return finish(c, true);
}

/**
 * Opaque zebra on asphalt — never transparent.
 * Transparent + mipmaps was collapsing into solid white rectangles on the road.
 */
export function zebraTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 64);
  asphalt(ctx, 256, 64, "#3a3e44");
  // Muted bars with asphalt gaps — mipmaps stay readable as stripes, not a white slab
  for (let i = 0; i < 10; i += 1) {
    const x = 8 + i * 25;
    ctx.fillStyle = "#c4beb0";
    ctx.fillRect(x, 8, 12, 48);
  }
  return finish(c, true);
}

/** Sidewalk / plaza tile — mid-grey base so vertex colors don't blast white. */
export function paverTexture(base: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  // Never fill pure white — white×vertexColor still specular-blows at dusk
  ctx.fillStyle = base === "#ffffff" || base === "#fff" ? "#8a8680" : base;
  ctx.fillRect(0, 0, 128, 128);
  const rng = mulberry32(11);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  for (let i = 0; i < 700; i += 1) {
    const g = 60 + Math.floor(rng() * 40);
    ctx.fillStyle = `rgba(${g},${g},${g - 4},0.06)`;
    ctx.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  return finish(c, true);
}
