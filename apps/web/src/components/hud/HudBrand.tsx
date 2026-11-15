"use client";

import { toast as pushToast, useGame } from "@/game/store";
import { MISSIONS, levelInfo, missionsDone } from "@/game/vibe";
import { useNet } from "@/net/store";
import { buildShareUrl } from "@/world/meets";
import type { CityData } from "@/world/types";

function clampHp(n: number): number {
  return Math.max(0, Math.min(100, n | 0));
}

export function HudBrand({
  city,
  localTitle,
}: {
  city: CityData;
  localTitle: string;
}) {
  const hud = useGame((s) => s.hud);
  const cityId = useGame((s) => s.cityId);
  const meetId = useGame((s) => s.meetId);
  const vibe = useGame((s) => s.vibe);
  const selfId = useNet((s) => s.selfId);
  const vibeInfo = levelInfo(vibe.xp);
  const dailyLeft = MISSIONS.length - missionsDone(vibe);
  const displayTitle = localTitle || vibeInfo.title;

  const inviteToMe = async () => {
    if (!selfId) return;
    const url = buildShareUrl({
      origin: window.location.origin + "/",
      city: cityId,
      meet: meetId,
      join: selfId,
    });
    try {
      await navigator.clipboard.writeText(url);
      pushToast("Invite-to-me copied");
    } catch {
      pushToast("Couldn’t copy — share from the address bar");
    }
  };

  return (
    <section className="panel brand">
      <h1>INDIA IRL</h1>
      <p className="eyebrow">{city.config.name} · {city.config.hubs.slice(0, 2).join(" · ")}</p>
      <div className="vibe-chip">
        <span className="vibe-lv">Lv {vibeInfo.level}</span>
        <span className="vibe-title">{displayTitle}</span>
        {vibe.streak > 0 ? <span className="vibe-streak">{vibe.streak}d</span> : null}
      </div>
      <div className="xp-bar hud-xp" aria-hidden>
        <i style={{ width: `${Math.round(vibeInfo.progress * 100)}%` }} />
      </div>
      <div className="hp-bar" aria-label={`Health ${hud.hp}`}>
        <i style={{ width: `${clampHp(hud.hp)}%` }} />
        <span>{hud.hp}</span>
      </div>
      {dailyLeft > 0 ? (
        <p className="vibe-daily">{dailyLeft} daily left</p>
      ) : (
        <p className="vibe-daily">Daily clear</p>
      )}
      <button className="leave" onClick={() => useGame.setState({ phase: "menu", wasted: false, mapOpen: false })}>
        Change city / avatar
      </button>
      <button type="button" className="leave invite-me" onClick={inviteToMe}>
        Invite to me
      </button>
    </section>
  );
}
