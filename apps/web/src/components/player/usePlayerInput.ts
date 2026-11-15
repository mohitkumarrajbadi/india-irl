/** Keyboard / mouse / wheel bindings for the local player. */
import { useEffect, type MutableRefObject } from "react";
import { dispatchKeyAction } from "@/game/player/key-dispatch";
import type { PlayerCmds, PlayerState } from "@/game/player/types";
import { useGame } from "@/game/store";

function applyKey(keys: PlayerState["keys"], code: string, down: boolean): void {
  switch (code) {
    case "KeyW":
    case "ArrowUp":
      keys.w = down;
      break;
    case "KeyA":
    case "ArrowLeft":
      keys.a = down;
      break;
    case "KeyS":
    case "ArrowDown":
      keys.s = down;
      break;
    case "KeyD":
    case "ArrowRight":
      keys.d = down;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      keys.shift = down;
      break;
    case "Space":
      keys.space = down;
      break;
    default:
      break;
  }
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function usePlayerInput(
  s: PlayerState,
  cmds: MutableRefObject<PlayerCmds>,
  canvas: HTMLCanvasElement,
): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === "Space" || e.code === "Tab") e.preventDefault();
      if (e.repeat) {
        if (e.code === "Tab") e.preventDefault();
        return;
      }
      applyKey(s.keys, e.code, true);
      if (e.code === "Enter") e.preventDefault();
      dispatchKeyAction(s, cmds.current, e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      applyKey(s.keys, e.code, false);
      if (e.code === "Tab") useGame.setState({ emoteWheel: false });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      s.mouseX += e.movementX;
      s.mouseY += e.movementY;
    };
    const onWheel = (e: WheelEvent) => {
      s.zoom = Math.min(1.9, Math.max(0.55, s.zoom * (e.deltaY > 0 ? 1.08 : 0.92)));
    };
    const release = () => {
      const k = s.keys;
      k.w = k.a = k.s = k.d = k.shift = k.space = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("blur", release);
    return () => {
      release();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("blur", release);
    };
  }, [canvas, cmds, s]);
}
