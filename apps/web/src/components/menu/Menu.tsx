"use client";

/** Character creator / lobby — thin shell wiring panes + actions. */
import { useState, type CSSProperties } from "react";
import { cleanName, lookKey, type Look } from "@/avatar/appearance";
import { EMOTES } from "@/avatar/rig";
import { levelInfo, noteLookTweak } from "@/game/vibe";
import { useGame } from "@/game/store";
import { CITIES } from "@/world/cities";
import { CITY_UI } from "@/world/cityUi";
import { identityCaption } from "@/world/meets";
import { LookControls, type MenuTab } from "./LookControls";
import { copyInviteLink, enterGame, openWhatsAppShare, startMeetPlan } from "./menu-actions";
import { MenuSetup } from "./MenuSetup";
import { PreviewCanvas } from "./PreviewCanvas";
import { useMenuBootstrap } from "./useMenuBootstrap";

export default function Menu() {
  const look = useGame((s) => s.look);
  const name = useGame((s) => s.name);
  const cityId = useGame((s) => s.cityId);
  const meetId = useGame((s) => s.meetId);
  const setLook = useGame((s) => s.setLook);
  const [tab, setTab] = useState<MenuTab>("Body");
  const [emote, setEmote] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [copied, setCopied] = useState(false);
  const { stats, vibe, setVibe, plan, setPlan, flash, setFlash, localTitle } = useMenuBootstrap();

  const city = CITIES[cityId];
  const cityUi = CITY_UI[cityId];
  const info = levelInfo(vibe.xp);
  const cityStat = stats[cityId];
  const meetStat = meetId && cityStat?.meets?.[meetId] ? cityStat.meets[meetId] : null;
  const here = meetStat ? meetStat.n : cityStat?.online ?? 0;
  const talking = meetStat ? meetStat.talking : cityStat?.talking ?? 0;
  const place = meetId ? city.meets.find((m) => m.id === meetId)?.label ?? city.name : city.name;
  const ready = cleanName(name).length > 0;
  const caption = identityCaption(lookKey(look));

  const tweak = (patch: Partial<Look>) => {
    setLook(patch);
    setPulse((p) => p + 1);
    setVibe(noteLookTweak());
  };

  return (
    <main
      className="menu"
      data-city={cityId}
      style={
        {
          "--city-accent": cityUi.accent,
          "--city-soft": cityUi.accentSoft,
          "--city-art": cityUi.art,
        } as CSSProperties
      }
    >
      <MenuSetup
        name={name}
        cityId={cityId}
        meetId={meetId}
        stats={stats}
        vibe={vibe}
        plan={plan}
        localTitle={localTitle}
        ready={ready}
        place={place}
        copied={copied}
        onEnter={() => enterGame(name, look, cityId, vibe)}
        onCopy={() => {
          void copyInviteLink(cityId, meetId, setFlash).then((ok) => {
            if (ok) {
              setCopied(true);
              setTimeout(() => setCopied(false), 2200);
            }
          });
        }}
        onWhatsApp={() => openWhatsAppShare({ cityId, meetId, place, here, talking })}
        onPlan={() => void startMeetPlan({ cityId, meetId, name, onPlan: setPlan, onFlash: setFlash })}
      />

      <section className="menu-stage">
        <div className="stage-wash" aria-hidden />
        <PreviewCanvas look={look} emote={emote} pulse={pulse} cityId={cityId} />
        <div className="stage-badge">
          <span>Your look · OMMO</span>
          <strong>{localTitle || info.title}</strong>
          <em className="identity-caption">{caption}</em>
        </div>
        <div className="emote-row">
          {EMOTES.map((e) => (
            <button key={e.id} className={emote === e.id ? "chip on" : "chip"} onClick={() => setEmote(e.id)}>
              {e.id === 0 ? "Idle" : e.name}
            </button>
          ))}
        </div>
      </section>

      <LookControls
        look={look}
        tab={tab}
        setTab={setTab}
        tweak={tweak}
        onSurprise={() => {
          setPulse((p) => p + 1);
          setVibe(noteLookTweak());
          setFlash("Random drip — keep or tweak");
        }}
      />

      {flash ? <div className="menu-flash">{flash}</div> : null}
    </main>
  );
}
