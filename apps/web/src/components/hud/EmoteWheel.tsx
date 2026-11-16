"use client";

import { Hand, Music2, Sparkles } from "lucide-react";
import { EMOTES } from "@/avatar/rig";
import { pulseAction } from "@/game/input";
import { useGame } from "@/game/store";

const SLOTS = EMOTES.filter((e) => e.id > 0);

function emoteIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("wave") || n.includes("namaste") || n.includes("sit")) {
    return <Hand size={14} aria-hidden />;
  }
  if (n.includes("bhangra") || n.includes("garba") || n.includes("bollywood") || n.includes("groove")) {
    return <Music2 size={14} aria-hidden />;
  }
  return <Sparkles size={14} aria-hidden />;
}

const KEY_CODE: Record<string, string> = {
  Z: "KeyZ",
  X: "KeyX",
  C: "KeyC",
  V: "KeyV",
  R: "KeyR",
  G: "KeyG",
  B: "KeyB",
  Y: "KeyY",
  U: "KeyU",
};

/** Hold Tab radial — click or press 1–9 while open. */
export function EmoteWheel() {
  const open = useGame((s) => s.emoteWheel);
  if (!open) return null;

  return (
    <div className="emote-wheel" role="dialog" aria-label="Emotes">
      <p className="emote-wheel-hint">Hold <kbd>Tab</kbd> · pick · release</p>
      <div className="emote-wheel-ring">
        {SLOTS.map((e, i) => {
          const ang = -Math.PI / 2 + (i / SLOTS.length) * Math.PI * 2;
          const r = 78;
          const x = Math.cos(ang) * r;
          const y = Math.sin(ang) * r;
          return (
            <button
              key={e.id}
              type="button"
              className="emote-slot"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onMouseDown={(ev) => {
                ev.preventDefault();
                pulseAction(KEY_CODE[e.key] ?? "KeyZ");
                useGame.setState({ emoteWheel: false });
              }}
            >
              <span className="emote-slot-key">{i + 1}</span>
              {emoteIcon(e.name)}
              {e.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
