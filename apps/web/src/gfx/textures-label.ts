import * as THREE from "three";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d") as CanvasRenderingContext2D];
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
