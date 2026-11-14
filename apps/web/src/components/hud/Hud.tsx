"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatHour } from "@/gfx/env";
import { audioUi, setTrafficMuted, subscribeAudio, unlockAudio } from "@/game/audio";
import {
  clearJob,
  jobSecondsLeft,
  jobTitle,
  startChai,
  startDelivery,
  startFerry,
  useJob,
} from "@/game/jobs";
import { advanceStep, comebackCopy, loadOnboard, setIntent, type Intent } from "@/game/onboarding";
import { qualityLabel } from "@/game/quality";
import { toast as pushToast, useGame } from "@/game/store";
import { MISSIONS, levelInfo, missionsDone } from "@/game/vibe";
import { sendChat, useNet } from "@/net/store";
import { voice, VOICE_RANGE } from "@/net/voice";
import { SPECS } from "@/vehicles/specs";
import { buildShareUrl } from "@/world/meets";
import type { CityData } from "@/world/types";
import { BusinessCardPanel } from "./BusinessCardPanel";
import { EmoteWheel } from "./EmoteWheel";
import { FullscreenButton } from "./FullscreenButton";
import { HangoutPrompt } from "./HangoutPrompt";
import { MapPreview } from "./MapPreview";
import { Minimap } from "./Minimap";
import { TouchControls } from "./TouchControls";

const INTENTS: { id: NonNullable<Intent>; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "dating", label: "Dating" },
  { id: "referrals", label: "Referrals" },
  { id: "vibing", label: "Just vibing" },
];

function clampHp(n: number): number {
  return Math.max(0, Math.min(100, n | 0));
}

const STATUS: Record<string, { label: string; tone: string }> = {
  idle: { label: "Offline", tone: "bad" },
  connecting: { label: "Connecting…", tone: "warn" },
  relay: { label: "Live", tone: "ok" },
  local: { label: "This browser only", tone: "warn" },
  reconnecting: { label: "Reconnecting…", tone: "warn" },
};

function fpsClass(fps: number): string {
  if (fps >= 55) return "ok";
  if (fps >= 38) return "warn";
  return "bad";
}

export function Hud({ city }: { city: CityData }) {
  const hud = useGame((s) => s.hud);
  const locked = useGame((s) => s.locked);
  const chatOpen = useGame((s) => s.chatOpen);
  const toast = useGame((s) => s.toast);
  const toastAt = useGame((s) => s.toastAt);
  const wasted = useGame((s) => s.wasted);
  const status = useNet((s) => s.status);
  const peers = useNet((s) => s.peerIds.length);
  const selfId = useNet((s) => s.selfId);
  const chat = useNet((s) => s.chat);
  const cityId = useGame((s) => s.cityId);
  const meetId = useGame((s) => s.meetId);
  const onboardUi = useGame((s) => s.onboardUi);
  const highlightJob = useGame((s) => s.highlightJob);
  const [banner, setBanner] = useState("");
  const [bannerKey, setBannerKey] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [help, setHelp] = useState(false);
  const [localTitle] = useState(() => loadOnboard().localTitle);
  const [comebackDistrict] = useState(() => loadOnboard().comebackDistrict);
  const qualityId = useGame((s) => s.qualityId);
  const vibe = useGame((s) => s.vibe);
  const [voiceUi, setVoiceUi] = useState(voice.ui());
  const [aud, setAud] = useState(audioUi());
  const [speakerOff, setSpeakerOff] = useState(voice.speakerMuted);
  const job = useJob();
  const lastDistrict = useRef("");
  const vibeInfo = levelInfo(vibe.xp);
  const dailyLeft = MISSIONS.length - missionsDone(vibe);
  const displayTitle = localTitle || vibeInfo.title;

  useEffect(() => voice.subscribe(() => {
    setVoiceUi(voice.ui());
    setSpeakerOff(voice.speakerMuted);
  }), []);
  useEffect(() => subscribeAudio(() => setAud(audioUi())), []);

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

  const st = STATUS[status] ?? STATUS.idle;
  const spec = hud.vehicle > 0 ? SPECS[hud.vehicle as 1 | 2 | 3] : null;
  const left = jobSecondsLeft(job);

  const begin = (kind: "delivery" | "ferry" | "chai") => {
    unlockAudio();
    if (highlightJob) useGame.setState({ highlightJob: false });
    const err =
      kind === "delivery"
        ? startDelivery(city, hud.x, hud.z)
        : kind === "ferry"
          ? startFerry(city, hud.x, hud.z)
          : startChai(city, hud.x, hud.z);
    if (err) pushToast(err);
    else if (kind === "delivery") pushToast("Delivery dash · pick up the parcel");
    else if (kind === "ferry") pushToast("Cab ferry · get a cab, pick up a friend");
    else pushToast("Chai runner · grab a tray and serve");
  };

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

  const pickIntent = (id: NonNullable<Intent>) => {
    setIntent(id);
    useGame.setState({ onboardUi: "comeback" });
  };

  const dismissComeback = () => {
    advanceStep("done");
    useGame.setState({ onboardUi: null });
  };

  return (
    <div className={`hud${wasted ? " is-khatam" : ""}`}>
      {wasted ? (
        <div className="khatam" aria-live="assertive">
          <p className="khatam-word">KHATAM</p>
          <p className="khatam-sub">Respawning…</p>
        </div>
      ) : null}
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

      <section className="panel meter">
        <Minimap city={city} />
        <button type="button" className="map-open-btn" onClick={() => useGame.setState({ mapOpen: true })}>
          Open map · <kbd>N</kbd>
        </button>
        <div className="clock">
          <strong>{formatHour(hud.hour)}</strong>
          <span>IST</span>
        </div>
        <p className="row">
          <span className={`dot ${st.tone}`} /> {st.label} · {peers + 1} {peers === 0 ? "player" : "players"}
        </p>
        <p className={`row fps ${fpsClass(hud.fps)}`} title={`Graphics: ${qualityId}`}>
          {hud.fps} fps · {qualityLabel()}
        </p>
      </section>

      <MapPreview city={city} />

      {/* Compact audio + jobs — bottom center, not a wall of chrome */}
      <div className="dock">
        <div className="audio-strip" role="group" aria-label="Audio">
          <button
            type="button"
            className={aud.trafficMuted ? "strip-btn off" : "strip-btn"}
            title="City traffic bed + distant horns"
            onClick={() => {
              unlockAudio();
              setTrafficMuted(!aud.trafficMuted);
              pushToast(aud.trafficMuted ? "Traffic on" : "Traffic muted");
            }}
          >
            Traffic
          </button>
          <button
            type="button"
            className={speakerOff ? "strip-btn off" : "strip-btn"}
            title="Hear nearby voice chat"
            onClick={() => {
              unlockAudio();
              const next = voice.toggleSpeakerMuted();
              setSpeakerOff(next);
              pushToast(next ? "Speaker muted" : "Speaker on");
            }}
          >
            Speaker
          </button>
          <button
            type="button"
            className={`strip-btn ${voiceUi.on ? (voiceUi.muted ? "off" : "live") : ""}`}
            title="Mic on/mute · right-click to fully disable voice"
            onClick={() => {
              unlockAudio();
              if (!voiceUi.on) {
                void voice.enable().then(() => {
                  if (voice.error) pushToast(voice.error);
                  else pushToast(`Mic live · ${VOICE_RANGE} m`);
                });
              } else {
                voice.setMuted(!voiceUi.muted);
                pushToast(voice.muted ? "Mic muted" : "Mic live");
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (voiceUi.on) {
                voice.disable();
                pushToast("Voice off");
              }
            }}
          >
            {!voiceUi.on ? "Mic" : voiceUi.muted ? "Mic ·" : "Mic"}
          </button>
          <FullscreenButton />
        </div>

        {!job.kind ? (
          <div className="job-strip" role="group" aria-label="Jobs">
            <button
              type="button"
              className={highlightJob ? "job-chip highlight" : "job-chip"}
              onClick={() => begin("delivery")}
            >
              Delivery
            </button>
            <button type="button" className="job-chip" onClick={() => begin("ferry")}>
              Cab ferry
            </button>
            <button type="button" className="job-chip" onClick={() => begin("chai")}>
              Chai run
            </button>
          </div>
        ) : (
          <div className="job-active">
            <strong>{jobTitle(job.kind)}</strong>
            <span>
              {job.stage === "pickup" ? `→ ${job.fromLabel}` : `→ ${job.toLabel}`}
              {left >= 0 ? ` · ${left}s` : ""}
            </span>
            <button
              type="button"
              className="job-cancel"
              onClick={() => {
                clearJob();
                pushToast("Job cancelled");
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

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
          <kbd>{hud.prompt.split("  ")[0]}</kbd> {hud.prompt.split("  ").slice(1).join(" ")}
        </div>
      ) : null}
      {showToast && toast ? <div className="toast">{toast}</div> : null}

      {onboardUi === "intent" ? (
        <div className="onboard-card" role="dialog" aria-label="Who are you here for">
          <h2>Who are you here for?</h2>
          <p>Stored for later — nothing unlocks yet.</p>
          <div className="onboard-actions">
            {INTENTS.map((i) => (
              <button key={i.id} type="button" onClick={() => pickIntent(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {onboardUi === "comeback" ? (
        <div className="onboard-card" role="dialog" aria-label="Come back later">
          <h2>You’re in</h2>
          <p>{comebackCopy(comebackDistrict || city.config.hubs[0] || city.config.name)}</p>
          <div className="onboard-actions">
            <button type="button" onClick={dismissComeback}>
              Got it
            </button>
          </div>
        </div>
      ) : null}

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

      <section className="panel help">
        <button className="help-toggle" onClick={() => setHelp((h) => !h)}>
          {help ? "Hide" : "Controls"}
        </button>
        {help ? (
          <ul>
            <li><kbd>WASD</kbd> move · <kbd>F</kbd> enter / exit vehicle</li>
            <li><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> Auto / Scooter / Cab · <kbd>E</kbd> job action</li>
            <li>Hold <kbd>Tab</kbd> emotes · <kbd>R</kbd> punch · <kbd>G</kbd> kick</li>
            <li><kbd>H</kbd> horn · <kbd>M</kbd> mic · <kbd>N</kbd> map · <kbd>T</kbd> time</li>
            <li><kbd>Q</kbd> graphics · click minimap for city preview</li>
          </ul>
        ) : null}
      </section>

      {!locked && !chatOpen ? (
        <div className="prompt">
          <h2>Click to step into {city.config.name}</h2>
          <p>{city.config.tagline}</p>
        </div>
      ) : (
        <div className="crosshair" />
      )}

      <TouchControls />
    </div>
  );
}

function ChatInput() {
  const ref = useRef<HTMLInputElement>(null);
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = performance.now();
    ref.current?.focus();
  }, []);

  const close = () => useGame.setState({ chatOpen: false });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (performance.now() - openedAt.current < 250) return;
    const text = ref.current?.value ?? "";
    if (text.trim()) sendChat(text);
    close();
  };

  return (
    <form onSubmit={submit} className="chat-form">
      <input
        ref={ref}
        maxLength={140}
        placeholder="Say something nearby… (Enter to send, Esc to cancel)"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") close();
        }}
        onBlur={close}
        autoComplete="off"
      />
    </form>
  );
}
