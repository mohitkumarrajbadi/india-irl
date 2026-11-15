/** Live markers on top of a windowed or full atlas view. */
import type { CityData } from "../world/types";
import type { CityMapAtlas, MapMarkers } from "./city-map-types";

export function paintMapMarkers(
  ctx: CanvasRenderingContext2D,
  atlas: CityMapAtlas,
  city: CityData,
  markers: MapMarkers,
  toScreen: (wx: number, wz: number) => { x: number; y: number },
  dpr = 1,
): void {
  void atlas;
  const { job, peers, player, meetId, labels } = markers;

  if (job && job.stage !== "idle") {
    const a = toScreen(job.fromX, job.fromZ);
    const b = toScreen(job.toX, job.toZ);
    ctx.strokeStyle = "rgba(231, 197, 106, 0.85)";
    ctx.lineWidth = 2 * dpr;
    ctx.setLineDash([5 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    pin(ctx, a.x, a.y, "#46d6c4", dpr);
    pin(ctx, b.x, b.y, "#e0623a", dpr);
  }

  peers?.forEach((p) => {
    const s = toScreen(p.x, p.z);
    ctx.fillStyle = p.veh ? "#7ff0df" : "#f08a5d";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.2 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

  if (meetId) {
    const m = city.meets.find((x) => x.spec.id === meetId);
    if (m) {
      const s = toScreen(m.x, m.z);
      ctx.strokeStyle = "#e7c56a";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (labels) {
    ctx.font = `${11 * dpr}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const lm of city.landmarks) {
      const s = toScreen(lm.x, lm.z);
      label(ctx, lm.spec.label, s.x, s.y - 10 * dpr, dpr);
    }
    for (const m of city.meets) {
      const s = toScreen(m.x, m.z);
      label(ctx, m.spec.label, s.x, s.y - 9 * dpr, dpr);
    }
  }

  if (player) {
    const s = toScreen(player.x, player.z);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, -7 * dpr);
    ctx.lineTo(5 * dpr, 6 * dpr);
    ctx.lineTo(0, 3 * dpr);
    ctx.lineTo(-5 * dpr, 6 * dpr);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function pin(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, dpr: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4.5 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, dpr: number): void {
  const t = text.length > 18 ? `${text.slice(0, 16)}…` : text;
  ctx.fillStyle = "rgba(10, 14, 10, 0.72)";
  const w = ctx.measureText(t).width;
  ctx.fillRect(x - w / 2 - 4 * dpr, y - 12 * dpr, w + 8 * dpr, 14 * dpr);
  ctx.fillStyle = "#f3efe4";
  ctx.fillText(t, x, y);
}
