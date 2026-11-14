"use client";

/** Toggle browser fullscreen for streaming / OBS capture. */
import { useEffect, useState } from "react";
import { toast } from "@/game/store";

function isFs(): boolean {
  return typeof document !== "undefined" && !!document.fullscreenElement;
}

export function FullscreenButton() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(isFs());
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = async () => {
    try {
      if (isFs()) {
        await document.exitFullscreen();
        toast("Fullscreen off");
      } else {
        await document.documentElement.requestFullscreen();
        toast("Fullscreen on");
      }
    } catch {
      toast("Fullscreen blocked by browser");
    }
  };

  return (
    <button
      type="button"
      className={on ? "strip-btn live" : "strip-btn"}
      title="Fullscreen (stream / OBS)"
      onClick={() => void toggle()}
    >
      {on ? "Exit FS" : "Fullscreen"}
    </button>
  );
}
