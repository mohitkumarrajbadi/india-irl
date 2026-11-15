"use client";

import { unlockAudio } from "@/game/audio";
import { pulseAction, touchInput } from "@/game/input";
import { toast, useGame } from "@/game/store";
import { voice } from "@/net/voice";

export function TouchActions({ mode }: { mode: string }) {
  const fire = (code: string) => {
    unlockAudio();
    pulseAction(code);
  };

  return (
    <div className="touch-actions" data-touch-ui>
      <button
        type="button"
        className={touchInput.sprint ? "on" : ""}
        onTouchStart={(e) => {
          e.preventDefault();
          touchInput.sprint = true;
        }}
        onTouchEnd={() => {
          touchInput.sprint = false;
        }}
      >
        Sprint
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          touchInput.jump = true;
        }}
        onTouchEnd={() => {
          touchInput.jump = false;
        }}
      >
        {mode === "drive" ? "Brake" : "Jump"}
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          fire("KeyF");
        }}
      >
        {mode === "foot" ? "Enter" : "Exit"}
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          fire("KeyE");
        }}
      >
        Interact
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          fire("KeyH");
        }}
      >
        Horn
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          useGame.setState({ mapOpen: true });
        }}
      >
        Map
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          unlockAudio();
          if (!voice.on) void voice.enable().then(() => toast(voice.error || "Voice on"));
          else {
            voice.setMuted(!voice.muted);
            toast(voice.muted ? "Mic muted" : "Mic live");
          }
        }}
      >
        Mic
      </button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyZ"); }}>Wave</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyX"); }}>Namaste</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyC"); }}>Bhangra</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyB"); }}>Garba</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyY"); }}>Groove</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyU"); }}>Bollywood</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyV"); }}>Sit</button>
    </div>
  );
}
