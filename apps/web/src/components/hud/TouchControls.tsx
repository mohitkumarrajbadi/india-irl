"use client";

import { useEffect, useState } from "react";
import { isTouchUiPreferred } from "@/game/input";
import { useGame } from "@/game/store";
import { TouchActions } from "./TouchActions";
import { useTouchStick } from "./useTouchStick";

/**
 * Mobile / touch overlay: left stick move, right-half look drag,
 * action buttons for vehicles, jump, sprint, emotes.
 */
export function TouchControls() {
  const locked = useGame((s) => s.locked);
  const chatOpen = useGame((s) => s.chatOpen);
  const mode = useGame((s) => s.hud.mode);
  const [show, setShow] = useState(false);
  const { base, knob } = useTouchStick(show);

  useEffect(() => {
    setShow(isTouchUiPreferred());
  }, []);

  if (!show || chatOpen) return null;

  return (
    <div className="touch-ui" data-touch-ui>
      <div className="touch-stick" ref={base} aria-hidden>
        <div className="touch-stick-knob" ref={knob} />
      </div>

      {!locked ? (
        <p className="touch-hint">Drag left to move · right to look · tap buttons to ride</p>
      ) : null}

      <TouchActions mode={mode} />
    </div>
  );
}
