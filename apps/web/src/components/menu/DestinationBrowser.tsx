"use client";

/** World destination picker — spawn points in one world, not separate maps. */
import { useGame } from "@/game/store";
import { isWorldV1Enabled } from "@/game/sim/flags";
import type { StatsMap } from "@/net/stats";
import { destinationsForMenu, type DestinationKind, type WorldDestination } from "@/world/atlas";
import { CITIES } from "@/world/cities";

type Props = { stats: StatsMap };

const KIND_LABEL: Record<DestinationKind, string> = {
  city: "Major cities",
  district: "Neighborhoods",
  scenic: "Scenic",
  social: "Social meets",
  village: "Villages",
};

function selectDest(d: WorldDestination): void {
  useGame.setState({
    destId: d.id,
    cityId: d.cityId,
    meetId: d.meetId,
  });
}

export function DestinationBrowser({ stats }: Props) {
  const destId = useGame((s) => s.destId);
  const cityId = useGame((s) => s.cityId);
  const meetId = useGame((s) => s.meetId);
  const world = isWorldV1Enabled();
  const list = destinationsForMenu();
  const featured = list.filter((d) => d.featured);
  const activeId =
    destId ??
    list.find((d) => d.cityId === cityId && d.meetId === meetId)?.id ??
    list.find((d) => d.cityId === cityId && d.kind === "city")?.id ??
    featured[0]?.id;

  const kinds: DestinationKind[] = ["city", "district", "social", "village", "scenic"];

  return (
    <div className="dest-browser">
      <div className="dest-head">
        <span className="meets-label">World</span>
        <p className="dest-world-name">
          {world ? "OMMO · one connected landmass" : "OMMO · pick a starting city"}
        </p>
        <p className="dest-hint">
          {world
            ? "Choosing a place sets your spawn — you can drive everywhere without loading another map."
            : "Enable One World in Settings for seamless highways between cities."}
        </p>
      </div>

      <span className="meets-label">Featured</span>
      <div className="dest-featured">
        {featured.map((d) => {
          const n = stats[d.cityId]?.online ?? 0;
          const on = d.id === activeId;
          return (
            <button
              key={d.id}
              type="button"
              className={on ? "dest-card on" : "dest-card"}
              onClick={() => selectDest(d)}
            >
              <b>{d.label}</b>
              <span>{d.blurb}</span>
              <em>{n > 0 ? `${n} in ${CITIES[d.cityId].name}` : CITIES[d.cityId].name}</em>
            </button>
          );
        })}
      </div>

      {kinds.map((kind) => {
        const rows = list.filter((d) => d.kind === kind && !d.featured);
        if (rows.length === 0) return null;
        return (
          <div key={kind} className="dest-group">
            <span className="meets-label">{KIND_LABEL[kind]}</span>
            <div className="meet-row">
              {rows.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={d.id === activeId ? "chip on" : "chip"}
                  title={d.blurb}
                  onClick={() => selectDest(d)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
