"use client";

import { LogOut, UserPlus } from "lucide-react";
import { silenceMenuAudio } from "@/game/audio";
import { toast as pushToast, useGame } from "@/game/store";
import { useNet } from "@/net/store";
import { buildShareUrl } from "@/world/meets";
import type { CityData } from "@/world/types";

function clampHp(n: number): number {
  return Math.max(0, Math.min(100, n | 0));
}

export function HudBrand({
  city,
}: {
  city: CityData;
  localTitle: string;
}) {
  const hud = useGame((s) => s.hud);
  const cityId = useGame((s) => s.cityId);
  const meetId = useGame((s) => s.meetId);
  const selfId = useNet((s) => s.selfId);

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

  const district = hud.district || city.config.hubs[0] || "OMMO";

  return (
    <section className="panel brand">
      <div className="brand-row">
        <h1>OMMO</h1>
        <p className="eyebrow">{district}</p>
      </div>
      <div className="hp-bar" aria-label={`Health ${hud.hp}`}>
        <i style={{ width: `${clampHp(hud.hp)}%` }} />
      </div>
      <div className="brand-actions">
        <button
          className="leave"
          onClick={() => {
            silenceMenuAudio();
            useGame.setState({ phase: "menu", wasted: false, mapOpen: false });
          }}
        >
          <LogOut size={13} aria-hidden />
          Menu
        </button>
        <button type="button" className="leave invite-me" onClick={inviteToMe}>
          <UserPlus size={13} aria-hidden />
          Invite
        </button>
      </div>
    </section>
  );
}
