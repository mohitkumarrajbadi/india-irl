"use client";

import { useEffect } from "react";
import {
  advanceStep,
  applyEndowment,
  loadOnboard,
  patchOnboard,
  setLocalTitle,
} from "@/game/onboarding";
import { live } from "@/game/runtime";
import { disposeDriveSession, ensureDriveWorker } from "@/game/sim/drive-session";
import { isRapierDriveEnabled, isWorldV1Enabled } from "@/game/sim/flags";
import { toast, useGame } from "@/game/store";
import { connect, disconnect, useNet } from "@/net/store";
import { localTitleFor } from "@/world/meets";
import type { CityData } from "@/world/types";
import type { Look } from "@/avatar/appearance";

/** Net connect, onboard script, join-by-friend. */
export function useGameSession(city: CityData, name: string, look: Look): void {
  const cityId = useGame((s) => s.cityId);
  const meetId = useGame((s) => s.meetId);
  const joinId = useGame((s) => s.joinId);
  const worldV1 = isWorldV1Enabled();
  const roomId = worldV1 ? "ommo" : cityId;

  useEffect(() => {
    connect(roomId, name, look);
    if (isRapierDriveEnabled()) {
      ensureDriveWorker({ x: live.x, y: 0, z: live.z, yaw: live.yaw });
    }
    return () => {
      disconnect();
      disposeDriveSession();
    };
    // World mode: stay in one room across destination/city alias changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name]);

  useEffect(() => {
    const endowed = applyEndowment();
    if (endowed) useGame.setState({ vibe: endowed.vibe });
    const meet = meetId ? city.meets.find((m) => m.spec.id === meetId) : null;
    const title = localTitleFor(city.config.name, meet?.spec.label ?? null);
    const board = loadOnboard();
    if (!board.localTitle) setLocalTitle(title);
    const district = meet?.spec.label ?? city.config.hubs[0] ?? city.config.name;
    patchOnboard({ comebackDistrict: district });
    if (board.step === "done") return;

    patchOnboard({
      step: board.step === "customize" || board.step === "enter" ? "welcome_chai" : board.step,
    });
    toast(`Welcome · you’re ${loadOnboard().localTitle || title}`);
    const t1 = setTimeout(() => {
      toast("Walk up to a parked vehicle · press F to drive");
      advanceStep("first_ride");
    }, 2800);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  useEffect(() => {
    if (!joinId) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      const peer = useNet.getState().peerMap.get(joinId);
      if (peer && peer.snaps.length > 0) {
        const yaw = peer.ryaw || live.yaw;
        live.x = peer.rx + Math.cos(yaw) * 2.5;
        live.z = peer.rz - Math.sin(yaw) * 2.5;
        live.yaw = yaw;
        toast(`Joined ${peer.name}`);
        useGame.setState({ joinId: null });
        clearInterval(id);
        return;
      }
      if (tries >= 8) {
        toast("They’re offline — dropped you at the meet");
        useGame.setState({ joinId: null });
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [joinId]);
}
