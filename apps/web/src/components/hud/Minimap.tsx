"use client";

import { useEffect, useRef } from "react";
import { getCityMapAtlas, paintMapMarkers } from "@/gfx/city-map";
import { live } from "@/game/runtime";
import { useGame } from "@/game/store";
import { useNet } from "@/net/store";
import type { CityData } from "@/world/types";

const VIEW = 480; // metres across
const SIZE = 176;

/** Circular local radar — click / tap to open the full city map. */
export function Minimap({ city }: { city: CityData }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = SIZE * dpr;
    el.height = SIZE * dpr;
    const ctx = el.getContext("2d") as CanvasRenderingContext2D;
    const atlas = getCityMapAtlas(city);

    const draw = () => {
      const cx = atlas.mx(live.x);
      const cz = atlas.mz(live.z);
      const half = (VIEW / 2) * atlas.ppm;

      ctx.clearRect(0, 0, el.width, el.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(el.width / 2, el.height / 2, el.width / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#151c14";
      ctx.fillRect(0, 0, el.width, el.height);
      ctx.drawImage(atlas.canvas, cx - half, cz - half, half * 2, half * 2, 0, 0, el.width, el.height);

      const peers: { x: number; z: number; veh: boolean }[] = [];
      useNet.getState().peerMap.forEach((p) => {
        if (p.snaps.length === 0) return;
        peers.push({ x: p.rx, z: p.rz, veh: !!p.veh });
      });
      const screenScale = el.width / (half * 2);

      paintMapMarkers(
        ctx,
        atlas,
        city,
        {
          player: { x: live.x, z: live.z, yaw: live.yaw },
          peers,
        },
        (wx, wz) => ({
          x: el.width / 2 + (atlas.mx(wx) - cx) * screenScale,
          y: el.height / 2 + (atlas.mz(wz) - cz) * screenScale,
        }),
        dpr,
      );
      ctx.restore();
    };

    draw();
    const id = setInterval(draw, 100);
    return () => clearInterval(id);
  }, [city]);

  return (
    <button
      type="button"
      className="minimap-btn"
      onClick={() => useGame.setState({ mapOpen: true })}
      title="Open city map (N)"
      aria-label="Open city map"
    >
      <canvas ref={canvas} className="minimap" style={{ width: SIZE, height: SIZE }} />
      <span className="minimap-hint">Map</span>
    </button>
  );
}
