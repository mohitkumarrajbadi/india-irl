"use client";

import dynamic from "next/dynamic";
import { useGame } from "@/game/store";

// Three.js must never run on the server, so both screens load client-only.
const GameCanvas = dynamic(() => import("@/components/world/GameCanvas"), {
  ssr: false,
  loading: () => <div className="boot">Building the city…</div>,
});
const Menu = dynamic(() => import("@/components/menu/Menu"), {
  ssr: false,
  loading: () => <div className="boot">Loading…</div>,
});

export default function HomeClient() {
  const phase = useGame((s) => s.phase);
  return phase === "playing" ? <GameCanvas /> : <Menu />;
}
