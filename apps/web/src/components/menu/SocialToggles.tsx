"use client";

/** Settings: feature flags — kept off the main Play surface. */
import { useEffect, useState } from "react";
import { readFeatureFlag, setFeatureFlag } from "@/game/sim/flags";

export function SocialToggles() {
  const [social, setSocial] = useState(false);
  const [net, setNet] = useState(false);
  const [world, setWorld] = useState(false);
  const [worldFull, setWorldFull] = useState(false);

  useEffect(() => {
    setSocial(readFeatureFlag("socialV2"));
    setNet(readFeatureFlag("netV2"));
    setWorld(readFeatureFlag("worldV1"));
    setWorldFull(readFeatureFlag("worldFull"));
  }, []);

  return (
    <div className="social-toggles" role="group" aria-label="Settings">
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={world}
          onChange={(e) => {
            setFeatureFlag("worldV1", e.target.checked);
            setWorld(e.target.checked);
          }}
        />
        <span>One World (continuous map)</span>
        <kbd>worldV1</kbd>
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={worldFull}
          disabled={!world}
          onChange={(e) => {
            setFeatureFlag("worldFull", e.target.checked);
            setWorldFull(e.target.checked);
          }}
        />
        <span>All regions + corridors</span>
        <kbd>worldFull</kbd>
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={social}
          onChange={(e) => {
            setFeatureFlag("socialV2", e.target.checked);
            setSocial(e.target.checked);
          }}
        />
        <span>Voice hangouts &amp; cards</span>
        <kbd>socialV2</kbd>
      </label>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={net}
          onChange={(e) => {
            setFeatureFlag("netV2", e.target.checked);
            setNet(e.target.checked);
          }}
        />
        <span>Smoother peer poses</span>
        <kbd>netV2</kbd>
      </label>
      <p className="toggle-hint">Applies on next enter · One World keeps friends in a shared session across cities</p>
    </div>
  );
}
