"use client";

import { CITIES, CITY_IDS } from "@/world/cities";
import { CITY_UI } from "@/world/cityUi";
import { useGame } from "@/game/store";
import type { CityId } from "@/world/types";
import type { StatsMap } from "@/net/stats";
import { CityMapThumb } from "./CityMapThumb";

type Props = { cityId: CityId; meetId: string | null; stats: StatsMap };

export function CityPicker({ cityId, meetId, stats }: Props) {
  const city = CITIES[cityId];
  const cityUi = CITY_UI[cityId];
  const cityStat = stats[cityId];
  return (
    <>
    <div className="city-pick">
      <span className="meets-label">City</span>
      <div className="cities">
        {CITY_IDS.map((id) => {
          const c = CITIES[id];
          const ui = CITY_UI[id];
          const n = stats[id]?.online ?? 0;
          const t = stats[id]?.talking ?? 0;
          return (
            <button
              key={id}
              type="button"
              className={id === cityId ? "city on" : "city"}
              data-city={id}
              onClick={() => useGame.setState({ cityId: id, meetId: null })}
            >
              <i style={{ background: ui.art }} aria-hidden />
              <div className="city-copy">
                <b>{c.name}</b>
                <small>{ui.nick}</small>
                <span>{ui.landmark}</span>
              </div>
              <em className={n > 0 ? "hot" : ""}>
                {n > 0 ? `${n} online${t > 0 ? ` · ${t} mic` : ""}` : "Be first"}
              </em>
            </button>
          );
        })}
      </div>
      <div className="city-insight">
        <p className="city-mood">
          <strong>{cityUi.mood}</strong>
          <span>{city.tagline}</span>
        </p>
        <CityMapThumb cityId={cityId} meetId={meetId} />
      </div>
    </div>
    <div className="meets">
      <span className="meets-label">Spawn</span>
      <div className="meet-row">
        <button type="button" className={!meetId ? "chip on" : "chip"} onClick={() => useGame.setState({ meetId: null })}>
          City spawn
        </button>
        {city.meets.map((m) => {
          const ms = cityStat?.meets?.[m.id];
          return (
            <button
              key={m.id}
              type="button"
              className={meetId === m.id ? "chip on" : "chip"}
              title={m.blurb}
              onClick={() => useGame.setState({ meetId: m.id })}
            >
              {m.label}
              {ms && ms.n > 0 ? ` · ${ms.n}` : ""}
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
}
