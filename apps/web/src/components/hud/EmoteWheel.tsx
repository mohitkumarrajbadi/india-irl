"use client";

import { EMOTES } from "@/avatar/rig";
import { pulseAction } from "@/game/input";
import { useGame } from "@/game/store";

const SLOTS = EMOTES.filter((e) => e.id > 0);

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
              {e.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
