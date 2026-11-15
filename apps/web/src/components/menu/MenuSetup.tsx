"use client";

/** Left pane: brand, vibe, name, city, enter CTA. */
import { levelInfo, missionsDone, type VibeState } from "@/game/vibe";
import { honestHeadcount, type PlanInfo, type StatsMap } from "@/net/stats";
import { CITIES, CITY_IDS } from "@/world/cities";
import { useGame } from "@/game/store";
import type { CityId } from "@/world/types";
import { CityPicker } from "./CityPicker";

type Props = {
  name: string;
  cityId: CityId;
  meetId: string | null;
  stats: StatsMap;
  vibe: VibeState;
  plan: PlanInfo | null;
  localTitle: string;
  ready: boolean;
  place: string;
  copied: boolean;
  onEnter: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onPlan: () => void;
};

export function MenuSetup(p: Props) {
  const city = CITIES[p.cityId];
  const info = levelInfo(p.vibe.xp);
  const cityStat = p.stats[p.cityId];
  const meetStat = p.meetId && cityStat?.meets?.[p.meetId] ? cityStat.meets[p.meetId] : null;
  const here = meetStat ? meetStat.n : cityStat?.online ?? 0;
  const talking = meetStat ? meetStat.talking : cityStat?.talking ?? 0;
  const totalOnline = CITY_IDS.reduce((n, id) => n + (p.stats[id]?.online ?? 0), 0);
  const talkingAll = CITY_IDS.reduce((n, id) => n + (p.stats[id]?.talking ?? 0), 0);
  const done = missionsDone(p.vibe);
  const joins = cityStat?.recentJoins ?? [];

  return (
    <section className="menu-left">
      <div className="menu-pane">
        <header className="menu-hero">
          <h1 className="brand-hero">
            India <em>IRL</em>
          </h1>
          <p className="city-line">
            Hang out in <strong>{city.name}</strong>
          </p>
          <p className="hook-line">Build a look. Pick a plaza. Walk into a live room.</p>
          <p className="live-pill">
            <span className="live-dot" />
            {honestHeadcount(p.meetId ? here : totalOnline, p.meetId ? talking : talkingAll, p.place)}
          </p>
          {joins.length > 0 ? (
            <div className="join-ticker" aria-live="polite">
              {joins.slice(0, 2).map((j, i) => (
                <span key={`${j.name}-${j.at}-${i}`}>
                  {j.name} → {j.meet ? city.meets.find((m) => m.id === j.meet)?.label ?? j.meet : city.name}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="vibe-strip" title={`${info.into}/${info.need} vibe · ${done}/5 missions`}>
          <strong>Lv {info.level}</strong>
          <span>{p.localTitle || info.title}</span>
          <div className="xp-bar" aria-hidden>
            <i style={{ width: `${Math.round(info.progress * 100)}%` }} />
          </div>
          <em className={p.vibe.streak > 0 ? "on" : ""}>{p.vibe.streak || 0}d</em>
        </div>

        <label className="field">
          <span>Your name</span>
          <input
            value={p.name}
            maxLength={16}
            placeholder="e.g. Aarav"
            onChange={(e) => useGame.setState({ name: e.target.value.replace(/[<>]/g, "") })}
            onKeyDown={(e) => e.key === "Enter" && p.onEnter()}
          />
        </label>

        <CityPicker cityId={p.cityId} meetId={p.meetId} stats={p.stats} />

        {p.plan ? (
          <p className="plan-status">
            Plan {p.plan.expired ? "expired" : "live"} · {p.plan.joined.length} joined
            {!p.plan.expired
              ? ` · ends ${new Date(p.plan.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
            {p.plan.joined.length ? ` · ${p.plan.joined.slice(0, 4).join(", ")}` : ""}
          </p>
        ) : null}
      </div>

      <div className="enter-block">
        <button className="play pulse" disabled={!p.ready} onClick={p.onEnter}>
          {p.ready ? `Enter ${p.place}` : "Name yourself to enter"}
        </button>
        <div className="invite-row">
          <button type="button" className="ghost" onClick={p.onCopy}>
            {p.copied ? "Link copied" : "Copy invite"}
          </button>
          <button type="button" className="ghost" onClick={p.onWhatsApp}>
            WhatsApp
          </button>
          <button type="button" className="ghost" onClick={p.onPlan}>
            Start a plan
          </button>
        </div>
      </div>
    </section>
  );
}
