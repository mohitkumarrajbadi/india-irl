"use client";

/** Lobby shell: brand + stage + look — no repeated chrome. */
import { useEffect, useState, type CSSProperties } from "react";
import { cleanName, lookKey, type Look } from "@/avatar/appearance";
import { silenceMenuAudio } from "@/game/audio";
import { noteLookTweak } from "@/game/vibe";
import { useGame } from "@/game/store";
import { identityCaption } from "@/world/meets";
import { CookieBanner } from "./CookieBanner";
import { LookControls, type MenuTab } from "./LookControls";
import { copyInviteLink, enterGame, openWhatsAppShare } from "./menu-actions";
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
  const [pulse, setPulse] = useState(0);
  const [copied, setCopied] = useState(false);
  const { stats, vibe, setVibe, plan, setFlash, localTitle } = useMenuBootstrap();

  useEffect(() => {
    silenceMenuAudio();
  }, []);

  const ready = cleanName(name).length > 0;
  const caption = identityCaption(lookKey(look));
  const displayName = cleanName(name) || localTitle || "You";

  const tweak = (patch: Partial<Look>) => {
    setLook(patch);
    setPulse((p) => p + 1);
    setVibe(noteLookTweak());
  };

  return (
    <main
      className="menu"
      data-city="ommo"
      style={
        {
          "--city-accent": "#ff7a45",
          "--city-soft": "rgba(255, 122, 69, 0.16)",
          "--city-art": "linear-gradient(145deg, #0a2a28, #5ef0c8 55%, #ff7a45)",
        } as CSSProperties
      }
    >
      <MenuSetup
        name={name}
        stats={stats}
        plan={plan}
        ready={ready}
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
        onWhatsApp={() =>
          openWhatsAppShare({
            cityId,
            meetId,
            place: "OMMO",
            here: stats.ommo?.online ?? 0,
            talking: stats.ommo?.talking ?? 0,
          })
        }
      />

      <section className="menu-stage">
        <div className="stage-wash" aria-hidden />
        <PreviewCanvas look={look} emote={0} pulse={pulse} cityId={cityId} />
        <div className="stage-badge">
          <span>Your look</span>
          <strong>{displayName}</strong>
          <em className="identity-caption">{caption}</em>
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
          setFlash("New look — keep or tweak");
        }}
      />

      <CookieBanner />
    </main>
  );
}
