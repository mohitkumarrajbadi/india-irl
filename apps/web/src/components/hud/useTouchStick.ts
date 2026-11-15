"use client";

import { useEffect, useRef } from "react";
import { unlockAudio } from "@/game/audio";
import { touchInput } from "@/game/input";

const STICK_R = 56;

type StickState = { id: number | null; ox: number; oy: number; dx: number; dy: number };

/** Left-half move stick + right-half look drag. Returns refs for the stick base/knob. */
export function useTouchStick(enabled: boolean) {
  const stick = useRef<StickState>({ id: null, ox: 0, oy: 0, dx: 0, dy: 0 });
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const resetStick = () => {
      stick.current.id = null;
      stick.current.dx = 0;
      stick.current.dy = 0;
      touchInput.moving = false;
      touchInput.forward = 0;
      touchInput.strafe = 0;
      if (knob.current) knob.current.style.transform = "translate(-50%, -50%)";
    };

    const onTouchStart = (e: TouchEvent) => {
      unlockAudio();
      for (const t of Array.from(e.changedTouches)) {
        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        if (el?.closest?.("[data-touch-ui]")) continue;
        if (t.clientX < window.innerWidth * 0.45 && stick.current.id === null) {
          stick.current = { id: t.identifier, ox: t.clientX, oy: t.clientY, dx: 0, dy: 0 };
          touchInput.moving = true;
          if (base.current) {
            base.current.style.left = `${t.clientX}px`;
            base.current.style.top = `${t.clientY}px`;
            base.current.style.opacity = "1";
          }
        } else if (lookId.current === null && t.clientX >= window.innerWidth * 0.4) {
          lookId.current = t.identifier;
          lookLast.current = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === stick.current.id) {
          e.preventDefault();
          let dx = t.clientX - stick.current.ox;
          let dy = t.clientY - stick.current.oy;
          const mag = Math.hypot(dx, dy);
          if (mag > STICK_R) {
            dx = (dx / mag) * STICK_R;
            dy = (dy / mag) * STICK_R;
          }
          stick.current.dx = dx;
          stick.current.dy = dy;
          touchInput.strafe = dx / STICK_R;
          touchInput.forward = -dy / STICK_R;
          if (knob.current) knob.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        } else if (t.identifier === lookId.current) {
          e.preventDefault();
          touchInput.lookDX += t.clientX - lookLast.current.x;
          touchInput.lookDY += t.clientY - lookLast.current.y;
          lookLast.current = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === stick.current.id) {
          resetStick();
          if (base.current) base.current.style.opacity = "0.35";
        }
        if (t.identifier === lookId.current) lookId.current = null;
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      resetStick();
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled]);

  return { base, knob };
}
