"use client";

import { useEffect, useRef } from "react";
import { getCityMapAtlas, paintMapMarkers } from "@/gfx/city-map";
import { live } from "@/game/runtime";
import { useGame } from "@/game/store";
import { useNet } from "@/net/store";
import type { CityData } from "@/world/types";

/** Full-city map overlay — districts, meets, landmarks, peers, job route. */
export function MapPreview({ city }: { city: CityData }) {
  const open = useGame((s) => s.mapOpen);
  const meetId = useGame((s) => s.meetId);
  const canvas = useRef<HTMLCanvasElement>(null);
  const close = () => useGame.setState({ mapOpen: false });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyN") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = canvas.current;
    if (!el) return;
    const atlas = getCityMapAtlas(city);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const layout = () => {
      const pad = 24;
      const maxW = Math.min(window.innerWidth - pad * 2, 920);
      const maxH = Math.min(window.innerHeight - 120, 720);
      const fit = Math.min(maxW / atlas.width, maxH / atlas.height);
      const cssW = Math.floor(atlas.width * fit);
      const cssH = Math.floor(atlas.height * fit);
      el.style.width = `${cssW}px`;
      el.style.height = `${cssH}px`;
      el.width = cssW * dpr;
      el.height = cssH * dpr;
      return { cssW, cssH };
    };

    let { cssW, cssH } = layout();
    const ctx = el.getContext("2d") as CanvasRenderingContext2D;

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = "#121812";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.drawImage(atlas.canvas, 0, 0, cssW, cssH);

      const peers: { x: number; z: number; veh: boolean }[] = [];
      useNet.getState().peerMap.forEach((p) => {
        if (p.snaps.length === 0) return;
        peers.push({ x: p.rx, z: p.rz, veh: !!p.veh });
      });
      const sx = cssW / atlas.width;
      const sy = cssH / atlas.height;

      paintMapMarkers(
        ctx,
        atlas,
        city,
        {
          player: { x: live.x, z: live.z, yaw: live.yaw },
          peers,
          job: null,
          meetId,
          labels: true,
        },
        (wx, wz) => ({ x: atlas.mx(wx) * sx, y: atlas.mz(wz) * sy }),
        1,
      );

      // North marker
      ctx.fillStyle = "rgba(243,239,228,0.85)";
      ctx.font = "600 12px ui-sans-serif, system-ui";
      ctx.textAlign = "left";
      ctx.fillText("N ↑", 12, 20);
    };

    draw();
    const id = setInterval(draw, 120);
    const onResize = () => {
      ({ cssW, cssH } = layout());
      draw();
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", onResize);
    };
  }, [open, city, meetId]);

  if (!open) return null;

  return (
    <div className="map-preview" role="dialog" aria-label={`${city.config.name} map`} onClick={close}>
      <div className="map-preview-card" onClick={(e) => e.stopPropagation()}>
        <header className="map-preview-head">
          <div>
            <p className="eyebrow">{city.config.name}</p>
            <h2>City map</h2>
          </div>
          <button type="button" className="map-close" onClick={close} aria-label="Close map">
            Close · Esc
          </button>
        </header>
        <canvas ref={canvas} className="map-preview-canvas" />
        <ul className="map-legend" aria-label="Legend">
          <li><i className="leg you" /> You</li>
          <li><i className="leg peer" /> Friends</li>
          <li><i className="leg meet" /> Meet</li>
          <li><i className="leg land" /> Landmark</li>
          <li><i className="leg metro" style={{ background: city.config.metro.color }} /> Metro</li>
          <li><i className="leg job" /> Job route</li>
        </ul>
      </div>
    </div>
  );
}
