"use client";

import { useEffect, type RefObject } from "react";
import { unlockAudio } from "@/game/audio";
import { isTouchUiPreferred } from "@/game/input";
import { useGame } from "@/game/store";

/** Click/touch to lock pointer (desktop) or mark locked (touch). */
export function usePointerLock(stage: RefObject<HTMLDivElement | null>): void {
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
  }, [stage]);
}
