import * as THREE from "three";
import type { CityConfig } from "../world/types";

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
