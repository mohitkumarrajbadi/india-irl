"use client";

/** First-party cookie consent — profile memory only, no third-party trackers. */
import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/game/cookies";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(getConsent() == null);
  }, []);

  if (!open) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie preferences">
      <div className="cookie-banner-copy">
        <strong>Cookies on OMMO</strong>
        <p>
          We use first-party cookies to remember your name and look on this device. No ads, no third-party trackers.
        </p>
      </div>
      <div className="cookie-banner-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setConsent("essential");
            setOpen(false);
          }}
        >
          Essential only
        </button>
        <button
          type="button"
          className="play cookie-accept"
          onClick={() => {
            setConsent("accepted");
            setOpen(false);
          }}
        >
          Accept &amp; remember
        </button>
      </div>
    </div>
  );
}
