"use client";

/**
 * Phase F: mount/unmount streamed assets for the 9-cell neighborhood.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { live } from "@/game/runtime";
import { cellOf } from "@/game/sim/chunk-cell";
import { isContentV2Enabled } from "@/game/sim/flags";
import { bootContentStreaming } from "@/game/stream/boot-mods";
import { type StreamAsset } from "@/game/stream/catalog";
import { residentAssets } from "@/game/stream/resident";
import { StreamedAsset } from "./StreamedAsset";

export function StreamedContent() {
  const on = typeof window !== "undefined" && isContentV2Enabled();
  const [active, setActive] = useState<StreamAsset[]>([]);
  const [ready, setReady] = useState(false);
  const cell = useRef({ cx: Number.NaN, cz: Number.NaN });

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    void bootContentStreaming().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [on]);

  useFrame(() => {
    if (!on || !ready) return;
    const next = cellOf(live.x, live.z);
    if (next.cx === cell.current.cx && next.cz === cell.current.cz) return;
    cell.current = next;
    setActive(residentAssets(live.x, live.z));
  });

  if (!on || !ready) return null;

  return (
    <group name="streamed-content">
      {active.map((a) => (
        <StreamedAsset key={a.id} asset={a} />
      ))}
    </group>
  );
}
