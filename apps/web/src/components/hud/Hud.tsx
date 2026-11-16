"use client";

import { Bike, CarFront, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadOnboard } from "@/game/onboarding";
import { useGame } from "@/game/store";
import { useNet } from "@/net/store";
import { SPECS } from "@/vehicles/specs";
import type { CityData } from "@/world/types";
import { BusinessCardPanel } from "./BusinessCardPanel";
import { ChatInput } from "./ChatInput";
import { EmoteWheel } from "./EmoteWheel";
import { HangoutPrompt } from "./HangoutPrompt";
import { HudBrand } from "./HudBrand";
import { HudDock } from "./HudDock";
import { HudHelp } from "./HudHelp";
import { HudMeter } from "./HudMeter";
import { HudOnboard } from "./HudOnboard";
import { MapPreview } from "./MapPreview";
import { TouchControls } from "./TouchControls";

function promptIcon(prompt: string) {
  const t = prompt.toLowerCase();
  if (t.includes("exit")) return <LogOut size={14} aria-hidden />;
  if (t.includes("steal") || t.includes("scooter") || t.includes("bike")) {
    return <Bike size={14} aria-hidden />;
  }
  if (t.includes("enter") || t.includes("vehicle") || t.includes("cab") || t.includes("auto")) {
    return <CarFront size={14} aria-hidden />;
  }
  return <CarFront size={14} aria-hidden />;
}

export function Hud({ city }: { city: CityData }) {
  const hud = useGame((s) => s.hud);
  const locked = useGame((s) => s.locked);
  const chatOpen = useGame((s) => s.chatOpen);
  const toast = useGame((s) => s.toast);
  const toastAt = useGame((s) => s.toastAt);
  const wasted = useGame((s) => s.wasted);
  const chat = useNet((s) => s.chat);
  const [banner, setBanner] = useState("");
  const [bannerKey, setBannerKey] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [localTitle] = useState(() => loadOnboard().localTitle);
  const [comebackDistrict] = useState(() => loadOnboard().comebackDistrict);
  const lastDistrict = useRef("");
  const spec = hud.vehicle > 0 ? SPECS[hud.vehicle as 1 | 2 | 3] : null;

  useEffect(() => {
    if (hud.district && hud.district !== lastDistrict.current) {
      lastDistrict.current = hud.district;
      setBanner(hud.district);
      setBannerKey((k) => k + 1);
    }
  }, [hud.district]);

  useEffect(() => {
    if (!toastAt) return;
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 3200);
    return () => clearTimeout(t);
  }, [toastAt]);

  return (
    <div className={`hud${wasted ? " is-khatam" : ""}`}>
      {wasted ? (
        <div className="khatam" aria-live="assertive">
          <p className="khatam-word">KHATAM</p>
          <p className="khatam-sub">Respawning…</p>
        </div>
      ) : null}

      <HudBrand city={city} localTitle={localTitle} />
      <HudMeter city={city} />
      <MapPreview city={city} />
      <HudDock />

      {banner ? (
        <div className="district" key={bannerKey}>
          <span>{city.config.name}</span>
          <strong>{banner}</strong>
        </div>
      ) : null}

      {spec ? (
        <div className="speedo">
          <strong>{hud.kmh}</strong>
          <span>km/h</span>
          <small>{spec.name}</small>
        </div>
      ) : null}

      {hud.prompt ? (
        <div className="interact">
          {promptIcon(hud.prompt)}
          <kbd>{hud.prompt.split("  ")[0]}</kbd> {hud.prompt.split("  ").slice(1).join(" ")}
        </div>
      ) : null}
      {showToast && toast ? <div className="toast">{toast}</div> : null}

      <HudOnboard
        comebackDistrict={comebackDistrict}
        cityLabel={city.config.hubs[0] || city.config.name}
      />

      <EmoteWheel />
      <HangoutPrompt />
      <BusinessCardPanel />

      <section className="chat">
        <ul>
          {chat.slice(-7).map((m) => (
            <li key={m.id} className={m.mine ? "mine" : ""}>
              <b>{m.name}</b> {m.text}
            </li>
          ))}
        </ul>
        {chatOpen ? <ChatInput /> : <p className="chat-hint"><kbd>Enter</kbd> to chat</p>}
      </section>

      <HudHelp />

      {!locked && !chatOpen ? (
        <div className="prompt">
          <h2>Click to enter {city.config.name}</h2>
          <p>{city.config.tagline}</p>
        </div>
      ) : (
        <div className="crosshair" aria-hidden />
      )}

      <TouchControls />
    </div>
  );
}
