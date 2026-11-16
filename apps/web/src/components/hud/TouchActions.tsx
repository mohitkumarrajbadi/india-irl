"use client";

import {
  Bike,
  CarFront,
  Hand,
  Map as MapIcon,
  Mic,
  PersonStanding,
  Zap,
} from "lucide-react";
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
        <Zap size={16} aria-hidden />
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
        <PersonStanding size={16} aria-hidden />
        {mode === "drive" ? "Brake" : "Jump"}
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          fire("KeyF");
        }}
      >
        {mode === "foot" ? <CarFront size={16} aria-hidden /> : <Bike size={16} aria-hidden />}
        {mode === "foot" ? "Enter" : "Exit"}
      </button>
      <button
        type="button"
        onTouchStart={(e) => {
          e.preventDefault();
          fire("KeyE");
        }}
      >
        <Hand size={16} aria-hidden />
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
        <MapIcon size={16} aria-hidden />
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
        <Mic size={16} aria-hidden />
        Mic
      </button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyZ"); }}>
        <Hand size={16} aria-hidden />
        Wave
      </button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyX"); }}>Namaste</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyC"); }}>Bhangra</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyB"); }}>Garba</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyY"); }}>Groove</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyU"); }}>Bollywood</button>
      <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyV"); }}>Sit</button>
    </div>
  );
}
