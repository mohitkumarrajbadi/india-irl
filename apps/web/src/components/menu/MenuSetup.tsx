"use client";

/** Left lobby: brand, name, enter — profile remember lives under the name field. */
import { useEffect, useState } from "react";
import { honestHeadcount, type PlanInfo, type StatsMap } from "@/net/stats";
import { CITY_IDS } from "@/world/cities";
import { getRememberProfile, setRememberProfile } from "@/game/profile";
import { useGame } from "@/game/store";
import { SocialToggles } from "./SocialToggles";

type Panel = "home" | "settings";

type Props = {
  name: string;
  stats: StatsMap;
  plan: PlanInfo | null;
  ready: boolean;
  copied: boolean;
  onEnter: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
};

export function MenuSetup(p: Props) {
  const [panel, setPanel] = useState<Panel>("home");
  const [remember, setRemember] = useState(false);
  const totalOnline = CITY_IDS.reduce((n, id) => n + (p.stats[id]?.online ?? 0), 0);
  const talkingAll = CITY_IDS.reduce((n, id) => n + (p.stats[id]?.talking ?? 0), 0);
  const ommoOnline = p.stats.ommo?.online ?? 0;
  const worldPop = ommoOnline > 0 ? ommoOnline : totalOnline;

  useEffect(() => {
    setRemember(getRememberProfile());
  }, []);

  return (
    <section className="menu-left">
      <div className="menu-pane">
        <header className="menu-hero">
          <h1 className="brand-hero">
            OMM<em>O</em>
          </h1>
          <p className="city-line">One shared world</p>
          <p className="hook-line">Walk, ride, and hang with people who are actually here.</p>
          <p className="live-pill">
            <span className="live-dot" />
            {honestHeadcount(worldPop, talkingAll, "OMMO")}
          </p>
        </header>

        {panel === "home" ? (
          <>
            <label className="field">
              <span>Your name</span>
              <input
                value={p.name}
                maxLength={16}
                placeholder="Who are you?"
                autoComplete="nickname"
                onChange={(e) => useGame.setState({ name: e.target.value.replace(/[<>]/g, "") })}
                onKeyDown={(e) => e.key === "Enter" && p.onEnter()}
              />
            </label>
            <label className="toggle-row remember-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => {
                  const on = e.target.checked;
                  setRememberProfile(on);
                  setRemember(on);
                }}
              />
              <span>Save my name &amp; look on this device</span>
            </label>
          </>
        ) : (
          <SocialToggles />
        )}

        {p.plan && !p.plan.expired ? (
          <p className="plan-status">
            Meet live · {p.plan.joined.length} joined
            {p.plan.joined.length ? ` · ${p.plan.joined.slice(0, 3).join(", ")}` : ""}
          </p>
        ) : null}
      </div>

      <div className="enter-block">
        {panel === "home" ? (
          <>
            <button className="play pulse" disabled={!p.ready} onClick={p.onEnter}>
              {p.ready ? "Enter world" : "Name yourself first"}
            </button>
            <div className="menu-links">
              <button type="button" className="linkish" onClick={p.onCopy}>
                {p.copied ? "Link copied" : "Invite friends"}
              </button>
              <span className="menu-links-dot" aria-hidden>
                ·
              </span>
              <button type="button" className="linkish" onClick={p.onWhatsApp}>
                WhatsApp
              </button>
              <span className="menu-links-dot" aria-hidden>
                ·
              </span>
              <button type="button" className="linkish" onClick={() => setPanel("settings")}>
                Settings
              </button>
            </div>
          </>
        ) : (
          <button type="button" className="ghost" onClick={() => setPanel("home")}>
            Back
          </button>
        )}
      </div>
    </section>
  );
}
