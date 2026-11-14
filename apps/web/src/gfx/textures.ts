import * as THREE from "three";
import type { CityConfig } from "../world/types";
import { mulberry32 } from "../lib/rng";

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
  // Tyre-wear bands.
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(w * 0.18, 0, w * 0.1, h);
  ctx.fillRect(w * 0.72, 0, w * 0.1, h);
}

/** Tile is 16 m long (v) and as wide as the road (u). */
export function roadTexture(kind: "minor" | "arterial" | "plain"): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  asphalt(ctx, W, H);
  const dash = (u: number, wPx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(u * W - wPx / 2, 0, wPx, H * 0.28);
    ctx.fillRect(u * W - wPx / 2, H * 0.5, wPx, H * 0.28);
  };
  const solid = (u: number, wPx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(u * W - wPx / 2, 0, wPx, H);
  };
  if (kind === "minor") {
    dash(0.5, 5, "#e9e4d0");
    solid(0.045, 4, "#d8d3c0");
    solid(0.955, 4, "#d8d3c0");
  } else if (kind === "arterial") {
    // 18 m wide: median 2 m in the middle, two lanes each side.
    ctx.fillStyle = "#8d8776";
    ctx.fillRect(W * 0.444, 0, W * 0.112, H);
    ctx.fillStyle = "#f2c230";
    ctx.fillRect(W * 0.44, 0, 3, H);
    ctx.fillRect(W * 0.56 - 3, 0, 3, H);
    dash(0.2556, 4, "#e9e4d0");
    dash(0.7444, 4, "#e9e4d0");
    solid(0.067, 4, "#e9e4d0");
    solid(0.933, 4, "#e9e4d0");
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

const FALLBACK_BILLBOARDS = [
  "WE'RE HIRING · SDE-2",
  "Ship it. Then chai.",
  "Build in India",
  "Cloud Careers",
  "Scale to a billion",
  "Standup at 10:00",
  "No deploys on Friday",
  "Fast. Reliable. Desi.",
];

const SIGN_COLORS = ["#b3261e", "#1f7a3a", "#1d4e89", "#c77700", "#6a1b4d", "#00695c", "#2b2b2b", "#8a2be2"];

export type SignAtlas = {
  texture: THREE.CanvasTexture;
  /** [u0, v0, du, dv] for a cell. Cells 0..shops-1 are shops, then 8 billboards. */
  rect: (cell: number, billboard: boolean) => [number, number, number, number];
};

export function signAtlas(cfg: CityConfig): SignAtlas {
  const COLS = 4;
  const ROWS = 8;
  const CW = 256;
  const CH = 64;
  const [c, ctx] = canvas(COLS * CW, ROWS * CH);
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, c.width, c.height);
  const boards = cfg.billboards?.length ? cfg.billboards : FALLBACK_BILLBOARDS;
  const labels = [...cfg.shops, ...boards];
  labels.forEach((text, k) => {
    const x = (k % COLS) * CW;
    const y = Math.floor(k / COLS) * CH;
    const isBoard = k >= cfg.shops.length;
    ctx.fillStyle = isBoard ? "#0e1b2c" : SIGN_COLORS[k % SIGN_COLORS.length];
    ctx.fillRect(x, y, CW, CH);
    ctx.strokeStyle = isBoard ? "#46d6c4" : "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 4, CW - 8, CH - 8);
    let size = 34;
    ctx.font = `800 ${size}px ui-sans-serif, system-ui, sans-serif`;
    while (ctx.measureText(text).width > CW - 28 && size > 12) {
      size -= 2;
      ctx.font = `800 ${size}px ui-sans-serif, system-ui, sans-serif`;
    }
    ctx.fillStyle = isBoard ? "#7ff0df" : "#fff7e0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + CW / 2, y + CH / 2 + 2);
  });
  const texture = finish(c, false);
  const shopCount = cfg.shops.length;
  return {
    texture,
    rect: (cell, billboard) => {
      const k = billboard ? shopCount + (cell % boards.length) : cell % shopCount;
      const col = k % COLS;
      const row = Math.floor(k / COLS);
      return [col / COLS, 1 - (row + 1) / ROWS, 1 / COLS, 1 / ROWS];
    },
  };
}

/** Floating text label used for player names and chat bubbles. */
export function labelTexture(
  text: string,
  opts: { bg: string; fg: string; size: number; maxWidth: number },
): { texture: THREE.CanvasTexture; aspect: number } {
  const pad = 14;
  const [probe, pctx] = canvas(8, 8);
  void probe;
  pctx.font = `700 ${opts.size}px ui-sans-serif, system-ui, sans-serif`;
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (pctx.measureText(test).width > opts.maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  const widest = Math.max(...lines.map((l) => pctx.measureText(l).width));
  const lh = opts.size * 1.25;
  const w = Math.ceil(widest + pad * 2);
  const h = Math.ceil(lines.length * lh + pad * 1.2);
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = opts.bg;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.fill();
  ctx.font = `700 ${opts.size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = opts.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => ctx.fillText(l, w / 2, pad * 0.6 + lh * (i + 0.5)));
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { texture, aspect: w / h };
}
