"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Hud } from "@/components/hud/Hud";
import { unlockAudio } from "@/game/audio";
import { isTouchUiPreferred } from "@/game/input";
import {
  advanceStep,
  applyEndowment,
  loadOnboard,
  patchOnboard,
  setLocalTitle,
} from "@/game/onboarding";
import { applyQuality, loadQualityPreference, quality } from "@/game/quality";
import { live, runtime } from "@/game/runtime";
import { toast, useGame } from "@/game/store";
import { StaticGrid } from "@/lib/spatial";
import { connect, disconnect, useNet } from "@/net/store";
import { CITIES } from "@/world/cities";
import { generateCity } from "@/world/generate";
import { localTitleFor } from "@/world/meets";
import { Scene } from "./Scene";

export default function GameCanvas() {
  const stage = useRef<HTMLDivElement>(null);
  const cityId = useGame((s) => s.cityId);
  const name = useGame((s) => s.name);
  const look = useGame((s) => s.look);
  const qualityId = useGame((s) => s.qualityId);
  const joinId = useGame((s) => s.joinId);
  const q = useMemo(() => {
    applyQuality(qualityId);
    return quality.active;
  }, [qualityId]);

  const meetId = useGame((s) => s.meetId);

  // Generated once per city. Deterministic from the seed, so every client agrees.
  const city = useMemo(() => {
    applyQuality(loadQualityPreference());
    const data = generateCity(CITIES[cityId]);
    runtime.city = data;
    runtime.grid = new StaticGrid(data.boxes, data.circles, data.bounds);
    const meet = meetId ? data.meets.find((m) => m.spec.id === meetId) : null;
    if (meet) {
      data.spawn = { x: meet.x + 3.5, z: meet.z + 3.5, yaw: Math.PI / 2 };
      queueMicrotask(() => toast(`Meet: ${meet.spec.label} — ${meet.spec.blurb}`));
    }
    live.x = data.spawn.x;
    live.z = data.spawn.z;
    live.yaw = data.spawn.yaw;
    return data;
  }, [cityId, meetId]);

  useEffect(() => {
    connect(cityId, name, look);
    return () => {
      disconnect();
      runtime.city = null;
      runtime.grid = null;
    };
    // The look is fixed for the session, so reconnecting on edits is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, name]);

  // First-session endowment + local title + scripted win path.
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
    toast(`Welcome chai · you’re ${loadOnboard().localTitle || title}`);
    const t1 = setTimeout(() => {
      useGame.setState({ highlightJob: true });
      toast("Try Delivery — tap the chip, pick up, drop off");
      advanceStep("easy_job");
    }, 2800);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  // Join-by-friend: wait briefly for peer pose, else stay at meet/default.
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

  useEffect(() => {
    const canvas = stage.current?.querySelector("canvas");
    if (!canvas) return;
    const lock = () => {
      unlockAudio();
      if (isTouchUiPreferred()) {
        useGame.setState({ locked: true });
        return;
      }
      if (document.pointerLockElement === canvas) return;
      const pending = canvas.requestPointerLock();
      if (pending && typeof pending.catch === "function") void pending.catch(() => {});
    };
    const sync = () => {
      if (isTouchUiPreferred()) return;
      useGame.setState({ locked: document.pointerLockElement === canvas });
    };
    canvas.addEventListener("click", lock);
    canvas.addEventListener("touchstart", lock, { passive: true });
    document.addEventListener("pointerlockchange", sync);
    return () => {
      canvas.removeEventListener("click", lock);
      canvas.removeEventListener("touchstart", lock);
      document.removeEventListener("pointerlockchange", sync);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      useGame.setState({ locked: false });
    };
  }, []);

  return (
    <div
      className="stage"
      ref={stage}
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      aria-label={`India IRL, ${city.config.name}. Click the scene, then use WASD to move.`}
    >
      <Canvas
        key={`q-${q.id}-${q.dpr}-${q.shadows}`}
        dpr={[1, q.dpr]}
        shadows={q.shadows ? "percentage" : false}
        camera={{ fov: 58, near: 0.2, far: q.cameraFar, position: [city.spawn.x, 3, city.spawn.z - 6] }}
        gl={{ antialias: q.antialias, alpha: false, powerPreference: "high-performance", stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Scene city={city} name={name} look={look} />
      </Canvas>
      <Hud city={city} />
    </div>
  );
}
