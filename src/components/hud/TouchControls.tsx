"use client";

import { useEffect, useRef, useState } from "react";
import { unlockAudio } from "@/game/audio";
import { isTouchUiPreferred, pulseAction, touchInput } from "@/game/input";
import { toast, useGame } from "@/game/store";
import { voice } from "@/net/voice";

const STICK_R = 56;

type StickState = { id: number | null; ox: number; oy: number; dx: number; dy: number };

/**
 * Mobile / touch overlay: left stick move, right-half look drag,
 * action buttons for vehicles, jump, sprint, emotes.
 */
export function TouchControls() {
  const locked = useGame((s) => s.locked);
  const chatOpen = useGame((s) => s.chatOpen);
  const mode = useGame((s) => s.hud.mode);
  const [show, setShow] = useState(false);
  const stick = useRef<StickState>({ id: null, ox: 0, oy: 0, dx: 0, dy: 0 });
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShow(isTouchUiPreferred());
  }, []);

  useEffect(() => {
    if (!show) return;
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
        // Left half = stick, right half = look (when not on a button).
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
  }, [show]);

  if (!show || chatOpen) return null;

  const fire = (code: string) => {
    unlockAudio();
    pulseAction(code);
  };

  return (
    <div className="touch-ui" data-touch-ui>
      <div className="touch-stick" ref={base} aria-hidden>
        <div className="touch-stick-knob" ref={knob} />
      </div>

      {!locked ? (
        <p className="touch-hint">Drag left to move · right to look · tap buttons to ride</p>
      ) : null}

      <div className="touch-actions" data-touch-ui>
        <button type="button" className={touchInput.sprint ? "on" : ""} onTouchStart={(e) => { e.preventDefault(); touchInput.sprint = true; }} onTouchEnd={() => { touchInput.sprint = false; }}>Sprint</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); touchInput.jump = true; }} onTouchEnd={() => { touchInput.jump = false; }}>{mode === "drive" ? "Brake" : "Jump"}</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyF"); }}>{mode === "foot" ? "Enter" : "Exit"}</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyE"); }}>Job</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("Digit1"); }}>Auto</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("Digit2"); }}>Scooter</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("Digit3"); }}>Cab</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyH"); }}>Horn</button>
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
          Mic
        </button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyZ"); }}>Wave</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyX"); }}>Namaste</button>
        <button type="button" onTouchStart={(e) => { e.preventDefault(); fire("KeyV"); }}>Chai</button>
      </div>
    </div>
  );
}
