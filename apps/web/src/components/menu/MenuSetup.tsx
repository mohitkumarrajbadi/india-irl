"use client";

/** Left pane: OMMO brand, identity, destinations, enter CTA. */
import { useState } from "react";
import { levelInfo, missionsDone, MISSIONS, type VibeState } from "@/game/vibe";
import { honestHeadcount, type PlanInfo, type StatsMap } from "@/net/stats";
import { CITIES, CITY_IDS } from "@/world/cities";
import { useGame } from "@/game/store";
import type { CityId } from "@/world/types";
import { DestinationBrowser } from "./DestinationBrowser";
import { SocialToggles } from "./SocialToggles";

type Nav = "play" | "character" | "friends" | "settings";

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
  const [nav, setNav] = useState<Nav>("play");
  const city = CITIES[p.cityId];
  const info = levelInfo(p.vibe.xp);
  const cityStat = p.stats[p.cityId];
  const meetStat = p.meetId && cityStat?.meets?.[p.meetId] ? cityStat.meets[p.meetId] : null;
  const here = meetStat ? meetStat.n : cityStat?.online ?? 0;
  const talking = meetStat ? meetStat.talking : cityStat?.talking ?? 0;
  const totalOnline = CITY_IDS.reduce((n, id) => n + (p.stats[id]?.online ?? 0), 0);
  const talkingAll = CITY_IDS.reduce((n, id) => n + (p.stats[id]?.talking ?? 0), 0);
  const ommoOnline = p.stats.ommo?.online ?? 0;
  const worldPop = ommoOnline > 0 ? ommoOnline : totalOnline;
  const done = missionsDone(p.vibe);
  const joins = cityStat?.recentJoins ?? [];

  return (
    <section className="menu-left">
      <div className="menu-pane">
        <header className="menu-hero">
          <h1 className="brand-hero">
            OMMO
          </h1>
          <p className="city-line">
            One world · start near <strong>{p.place}</strong>
          </p>
          <p className="hook-line">Meet, explore, drive, and hang out in a living shared world.</p>
          <p className="live-pill">
            <span className="live-dot" />
            {honestHeadcount(p.meetId ? here : worldPop, p.meetId ? talking : talkingAll, p.place)}
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

        <nav className="menu-nav" aria-label="Lobby">
          {(
            [
              ["play", "Play"],
              ["character", "Character"],
              ["friends", "Friends"],
              ["settings", "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={nav === id ? "menu-nav-btn on" : "menu-nav-btn"}
              onClick={() => setNav(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="vibe-strip" title={`${info.into}/${info.need} vibe · ${done}/${MISSIONS.length} missions`}>
          <strong>Lv {info.level}</strong>
          <span>{p.localTitle || info.title}</span>
          <div className="xp-bar" aria-hidden>
            <i style={{ width: `${Math.round(info.progress * 100)}%` }} />
          </div>
          <em className={p.vibe.streak > 0 ? "on" : ""}>{p.vibe.streak || 0}d</em>
        </div>

        {(nav === "play" || nav === "character") && (
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
        )}

        {nav === "play" ? <DestinationBrowser stats={p.stats} /> : null}

        {nav === "character" ? (
          <p className="dest-hint">Use the center stage and right panel to customize body, hair, outfit, and extras.</p>
        ) : null}

        {nav === "friends" ? (
          <div className="friends-panel">
            <p className="dest-hint">Invite opens the same destination. Join a friend with their in-world Invite link (`?join=`).</p>
            <div className="invite-row">
              <button type="button" className="ghost" onClick={p.onCopy}>
                {p.copied ? "Link copied" : "Invite friends"}
              </button>
              <button type="button" className="ghost" onClick={p.onWhatsApp}>
                WhatsApp
              </button>
              <button type="button" className="ghost" onClick={p.onPlan}>
                Create a meet
              </button>
            </div>
            {worldPop > 0 ? (
              <p className="plan-status">{worldPop} online right now (relay)</p>
            ) : (
              <p className="plan-status">No one online yet — be first, then share your invite.</p>
            )}
          </div>
        ) : null}

        {nav === "settings" ? <SocialToggles /> : null}

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
          {p.ready ? "ENTER OMMO" : "Name yourself to enter"}
        </button>
        <div className="invite-row">
          <button type="button" className="ghost" onClick={p.onCopy}>
            {p.copied ? "Link copied" : "Invite friends"}
          </button>
          <button type="button" className="ghost" onClick={p.onPlan}>
            Create a meet
          </button>
        </div>
      </div>
    </section>
  );
}
