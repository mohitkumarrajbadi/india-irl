"use client";

import { useEffect, useRef } from "react";
import { live } from "@/game/runtime";
import { useNet } from "@/net/store";
import type { CityData } from "@/world/types";

const VIEW = 440; // meters across
const SIZE = 176; // css pixels
const PAD = 260;

const KIND_COLOR: Record<string, string> = {
  tech: "#44566b",
  cbd: "#3c5f78",
  resi: "#5a5f55",
  market: "#7a5a46",
  old: "#6c5240",
  park: "#3f6a3c",
  landmark: "#8a7a52",
  lake: "#2c6a86",
};

/** The static city is painted once to an offscreen canvas, then windowed each tick. */
function paintCity(city: CityData): HTMLCanvasElement {
  const { bounds } = city;
  const w = Math.ceil(bounds.maxX - bounds.minX + PAD * 2);
  const h = Math.ceil(bounds.maxZ - bounds.minZ + PAD * 2);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d") as CanvasRenderingContext2D;
  // North is +Z and east is -X, so flip both axes.
  const mx = (x: number) => bounds.maxX - x + PAD;
  const mz = (z: number) => bounds.maxZ - z + PAD;
  ctx.fillStyle = "#1a2118";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#38403a";
  for (const r of city.roadsX) ctx.fillRect(mx(r.c + r.half), mz(bounds.maxZ), r.half * 2, bounds.maxZ - bounds.minZ);
  for (const r of city.roadsZ) ctx.fillRect(mx(bounds.maxX), mz(r.c + r.half), bounds.maxX - bounds.minX, r.half * 2);
  ctx.fillStyle = "#cdb460";
  for (const r of city.roadsX) if (r.arterial) ctx.fillRect(mx(r.c + 0.4), mz(bounds.maxZ), 0.8, bounds.maxZ - bounds.minZ);
  for (const r of city.roadsZ) if (r.arterial) ctx.fillRect(mx(bounds.maxX), mz(r.c + 0.4), bounds.maxX - bounds.minX, 0.8);

  for (const b of city.blocks) {
    ctx.fillStyle = KIND_COLOR[b.kind] ?? "#555";
    ctx.fillRect(mx(b.maxX), mz(b.maxZ), b.maxX - b.minX, b.maxZ - b.minZ);
  }
  const l = city.metroLine;
  ctx.strokeStyle = city.config.metro.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mx(l.x0), mz(l.z0));
  ctx.lineTo(mx(l.x1), mz(l.z1));
  ctx.stroke();
  ctx.fillStyle = "#fff";
  for (const s of city.metroSegments) ctx.fillRect(mx((s.x0 + s.x1) / 2) - 4, mz((s.z0 + s.z1) / 2) - 4, 8, 8);
  ctx.fillStyle = "#e7c56a";
  for (const lm of city.landmarks) {
    ctx.beginPath();
    ctx.arc(mx(lm.x), mz(lm.z), 9, 0, Math.PI * 2);
    ctx.fill();
  }
  return off;
}

export function Minimap({ city }: { city: CityData }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = SIZE * dpr;
    el.height = SIZE * dpr;
    const ctx = el.getContext("2d") as CanvasRenderingContext2D;
    const off = paintCity(city);
    const { bounds } = city;
    const scale = (SIZE * dpr) / VIEW;

    const draw = () => {
      const cx = bounds.maxX - live.x + PAD;
      const cz = bounds.maxZ - live.z + PAD;
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(el.width / 2, el.height / 2, el.width / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#1a2118";
      ctx.fillRect(0, 0, el.width, el.height);
      ctx.drawImage(off, cx - VIEW / 2, cz - VIEW / 2, VIEW, VIEW, 0, 0, el.width, el.height);

      const { peerMap } = useNet.getState();
      peerMap.forEach((p) => {
        if (p.snaps.length === 0) return;
        const px = (cx - (bounds.maxX - p.rx + PAD)) * -1;
        const pz = (bounds.maxZ - p.rz + PAD) - cz;
        ctx.fillStyle = p.veh ? "#7ff0df" : "#f08a5d";
        ctx.beginPath();
        ctx.arc(el.width / 2 + px * scale, el.height / 2 + pz * scale, 3.4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Heading (sin, cos) maps to screen (-sin, -cos), which is a canvas rotation of -yaw.
      ctx.translate(el.width / 2, el.height / 2);
      ctx.rotate(-live.yaw);
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
    };
    draw();
    const id = setInterval(draw, 100);
    return () => clearInterval(id);
  }, [city]);

  return <canvas ref={canvas} className="minimap" style={{ width: SIZE, height: SIZE }} aria-label="Minimap" />;
}
