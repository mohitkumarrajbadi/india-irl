import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { ARTERIAL_LANES, ARTERIAL_WIDTH, MEDIAN } from "../world/gen-constants";

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
  // Patchy Indian asphalt — tar seams + faded patches
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = `rgba(28,28,30,${0.05 + rng() * 0.08})`;
    ctx.fillRect(rng() * w, rng() * h, 4 + rng() * 40, 2 + rng() * 6);
  }
  // Tyre-wear bands (outer + inner lanes) — subtle, not bright
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(w * 0.12, 0, w * 0.1, h);
  ctx.fillRect(w * 0.78, 0, w * 0.1, h);
  ctx.fillRect(w * 0.32, 0, w * 0.08, h);
  ctx.fillRect(w * 0.6, 0, w * 0.08, h);
}

/** Map metres-from-centreline → texture u (0…1 across road width). */
function uAt(metres: number): number {
  return 0.5 + metres / ARTERIAL_WIDTH;
}

/** Tile is 16 m long (v) and as wide as the road (u). India IRC-style LHT markings. */
export function roadTexture(kind: "minor" | "arterial" | "plain"): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  const [c, ctx] = canvas(W, H);
  asphalt(ctx, W, H, kind === "plain" ? "#383c42" : "#3a3e44");
  const dash = (u: number, wPx: number, color: string, gapMul = 1) => {
    ctx.fillStyle = color;
    const seg = H * 0.22 * gapMul;
    const gap = H * 0.18 * gapMul;
    for (let y = 0; y < H; y += seg + gap) {
      ctx.fillRect(u * W - wPx / 2, y, wPx, seg);
    }
  };
  const broken = (u: number, wPx: number, color: string) => {
    // Short broken dashes — common faded Indian centre / divider paint
    ctx.fillStyle = color;
    const seg = H * 0.12;
    const gap = H * 0.2;
    for (let y = H * 0.04; y < H; y += seg + gap) {
      ctx.fillRect(u * W - wPx / 2, y, wPx, seg);
    }
  };
  const solid = (u: number, wPx: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(u * W - wPx / 2, 0, wPx, H);
  };
  // IRC: white lane dashes, yellow for opposing divider; dusty/faded paint
  const mark = "#b8b0a0";
  const edge = "#a09888";
  const yellow = "#c9a028";
  const yellowFaded = "#9a7a28";
  if (kind === "minor") {
    // Two-way minor: broken yellow centre (LHT both ways), faded edges
    broken(0.5, 3, yellowFaded);
    solid(0.04, 3, edge);
    solid(0.96, 3, edge);
  } else if (kind === "arterial") {
    const medW = MEDIAN / ARTERIAL_WIDTH;
    // Dusty median strip (concrete / planted)
    ctx.fillStyle = "#5c584c";
    ctx.fillRect(W * (0.5 - medW / 2), 0, W * medW, H);
    // Sparse median weeds
    const rng = mulberry32(19);
    for (let i = 0; i < 14; i += 1) {
      ctx.fillStyle = `rgba(70,90,45,${0.15 + rng() * 0.25})`;
      ctx.fillRect(W * (0.5 - medW * 0.2) + rng() * W * medW * 0.4, rng() * H, 2 + rng() * 3, 6 + rng() * 10);
    }
    // Yellow lines along median edges (opposing traffic divider)
    solid(0.5 - medW / 2, 3, yellow);
    solid(0.5 + medW / 2, 3, yellow);
    // Lane separators from ARTERIAL_LANES midpoints — both carriageways (LHT)
    const lanes = ARTERIAL_LANES;
    for (let i = 0; i < lanes.length - 1; i += 1) {
      const mid = (lanes[i]! + lanes[i + 1]!) * 0.5;
      dash(uAt(mid), 3, mark);
      dash(uAt(-mid), 3, mark);
    }
    // Soft edge lines at curb
    solid(0.025, 3, edge);
    solid(0.975, 3, edge);
    // Occasional faded direction chevrons pointing “keep left” travel sense (along +v)
    ctx.fillStyle = "rgba(180,170,150,0.28)";
    for (const side of [-1, 1] as const) {
      const laneU = uAt(side * lanes[1]!);
      for (let y = H * 0.15; y < H; y += H * 0.55) {
        ctx.beginPath();
        ctx.moveTo(laneU * W, y);
        ctx.lineTo(laneU * W - 5 * side, y + 18);
        ctx.lineTo(laneU * W + 5 * side, y + 18);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  return finish(c, true);
}

/**
 * Opaque zebra on asphalt — never transparent.
 * Transparent + mipmaps was collapsing into solid white rectangles on the road.
 * Worn Indian crossing: uneven bars, dusty gaps.
 */
export function zebraTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 64);
  asphalt(ctx, 256, 64, "#3a3e44");
  const rng = mulberry32(23);
  for (let i = 0; i < 10; i += 1) {
    const x = 6 + i * 25 + (rng() - 0.5) * 3;
    const w = 10 + rng() * 4;
    const top = 6 + rng() * 4;
    const h = 44 + rng() * 8;
    ctx.fillStyle = i % 3 === 0 ? "#a8a090" : "#c4beb0";
    ctx.globalAlpha = 0.75 + rng() * 0.25;
    ctx.fillRect(x, top, w, h);
    ctx.globalAlpha = 1;
  }
  return finish(c, true);
}

/** Sidewalk / plaza — irregular Indian pavers, not mall-perfect grid. */
export function paverTexture(base: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  // Never fill pure white — white×vertexColor still specular-blows at dusk
  ctx.fillStyle = base === "#ffffff" || base === "#fff" ? "#8a8680" : base;
  ctx.fillRect(0, 0, 128, 128);
  const rng = mulberry32(11);
  // Irregular block sizes (cast-in-situ / broken tiles)
  for (let row = 0; row < 128; ) {
    const rh = 18 + Math.floor(rng() * 22);
    for (let col = 0; col < 128; ) {
      const cw = 16 + Math.floor(rng() * 28);
      ctx.strokeStyle = `rgba(0,0,0,${0.12 + rng() * 0.14})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(col + 0.5, row + 0.5, Math.min(cw, 128 - col) - 1, Math.min(rh, 128 - row) - 1);
      if (rng() < 0.18) {
        const g = 50 + Math.floor(rng() * 35);
        ctx.fillStyle = `rgba(${g},${g - 4},${g - 8},0.12)`;
        ctx.fillRect(col + 2, row + 2, Math.min(cw - 4, 20), Math.min(rh - 4, 14));
      }
      col += cw;
    }
    row += rh;
  }
  for (let i = 0; i < 700; i += 1) {
    const g = 60 + Math.floor(rng() * 40);
    ctx.fillStyle = `rgba(${g},${g},${g - 4},0.06)`;
    ctx.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  // Painted kerb flecks (yellow/black common on Indian streets)
  if (rng() < 1) {
    ctx.fillStyle = "rgba(200,160,40,0.08)";
    ctx.fillRect(0, 0, 128, 6);
    ctx.fillStyle = "rgba(20,20,20,0.06)";
    ctx.fillRect(0, 122, 128, 6);
  }
  return finish(c, true);
}
