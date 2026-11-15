"use client";

import { formatHour } from "@/gfx/env";
import { qualityLabel } from "@/game/quality";
import { useGame } from "@/game/store";
import { useNet } from "@/net/store";
import type { CityData } from "@/world/types";
import { Minimap } from "./Minimap";

const STATUS: Record<string, { label: string; tone: string }> = {
  idle: { label: "Offline", tone: "bad" },
  connecting: { label: "Connecting…", tone: "warn" },
  relay: { label: "Live", tone: "ok" },
  local: { label: "This browser only", tone: "warn" },
  reconnecting: { label: "Reconnecting…", tone: "warn" },
};

function fpsClass(fps: number): string {
  if (fps >= 55) return "ok";
  if (fps >= 38) return "warn";
  return "bad";
}

export function HudMeter({ city }: { city: CityData }) {
  const hud = useGame((s) => s.hud);
  const status = useNet((s) => s.status);
  const peers = useNet((s) => s.peerIds.length);
  const qualityId = useGame((s) => s.qualityId);
  const st = STATUS[status] ?? STATUS.idle;

  return (
    <section className="panel meter">
      <Minimap city={city} />
      <button type="button" className="map-open-btn" onClick={() => useGame.setState({ mapOpen: true })}>
        Open map · <kbd>N</kbd>
      </button>
      <div className="clock">
        <strong>{formatHour(hud.hour)}</strong>
        <span>IST</span>
      </div>
      <p className="row">
        <span className={`dot ${st.tone}`} /> {st.label} · {peers + 1} {peers === 0 ? "player" : "players"}
      </p>
      <p className={`row fps ${fpsClass(hud.fps)}`} title={`Graphics: ${qualityId}`}>
        {hud.fps} fps · {qualityLabel()}
      </p>
    </section>
  );
}
