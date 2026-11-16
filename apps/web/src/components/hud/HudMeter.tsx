"use client";

import { formatHour } from "@/gfx/env";
import { qualityLabel } from "@/game/quality";
import { useGame } from "@/game/store";
import { useNet } from "@/net/store";
import type { CityData } from "@/world/types";
import { Minimap } from "./Minimap";

const STATUS: Record<string, { label: string; tone: string; hint?: string }> = {
  idle: { label: "Offline", tone: "bad", hint: "Not connected to multiplayer" },
  connecting: { label: "Connecting…", tone: "warn", hint: "Reaching the OMMO relay" },
  relay: { label: "Live", tone: "ok", hint: "Online — friends on other devices can join" },
  local: {
    label: "This browser only",
    tone: "warn",
    hint: "Relay unreachable — other devices cannot see you. Set NEXT_PUBLIC_RELAY_URL / start the relay.",
  },
  reconnecting: { label: "Reconnecting…", tone: "warn", hint: "Lost relay — retrying" },
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
      <p className="row" title={st.hint}>
        <span className={`dot ${st.tone}`} /> {st.label} · {peers + 1} {peers === 0 ? "player" : "players"}
      </p>
      {status === "local" ? (
        <p className="row local-only-banner" role="status">
          Friends on other phones/PCs will not appear until the relay is online.
        </p>
      ) : null}
      <p className={`row fps ${fpsClass(hud.fps)}`} title={`Graphics: ${qualityId}`}>
        {hud.fps} fps · {qualityLabel()}
      </p>
      {hud.driveProfile ? (
        <p className="row drive-profile" title="Arcade vs Rapier step budget (?driveProfile=1)">
          {hud.driveProfile}
        </p>
      ) : null}
      {hud.convoy ? (
        <p className="row convoy" title="C invite/accept/regroup · Shift+C leave">
          {hud.convoy}
        </p>
      ) : null}
    </section>
  );
}
