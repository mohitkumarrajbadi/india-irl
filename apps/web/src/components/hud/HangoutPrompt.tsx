"use client";

import { useEffect, useState } from "react";
import { live, runtime } from "@/game/runtime";
import { hangoutPrompt } from "@/game/social/hangout";
import { isSocialV2Enabled } from "@/game/sim/flags";

/** Diegetic hangout hint when socialV2 is on. */
export function HangoutPrompt() {
  const on = typeof window !== "undefined" && isSocialV2Enabled();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => {
      const city = runtime.city;
      if (!city) {
        setText(null);
        return;
      }
      setText(hangoutPrompt(city, live.x, live.z));
    }, 200);
    return () => clearInterval(id);
  }, [on]);

  if (!on || !text) return null;
  return <div className="diegetic-prompt">{text}</div>;
}
