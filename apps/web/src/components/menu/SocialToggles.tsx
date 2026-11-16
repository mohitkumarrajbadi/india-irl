"use client";

/** Settings: profile memory + feature flags. */
import { useEffect, useState } from "react";
import { cleanName } from "@/avatar/appearance";
import {
  clearSavedProfile,
  getRememberProfile,
  saveProfileNow,
  setRememberProfile,
} from "@/game/profile";
import { readFeatureFlag, setFeatureFlag } from "@/game/sim/flags";
import { useGame } from "@/game/store";
import { getConsent, setConsent } from "@/game/cookies";

export function SocialToggles() {
  const name = useGame((s) => s.name);
  const look = useGame((s) => s.look);
  const cityId = useGame((s) => s.cityId);
  const [social, setSocial] = useState(false);
  const [net, setNet] = useState(false);
  const [remember, setRemember] = useState(false);
  const [consent, setConsentUi] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setSocial(readFeatureFlag("socialV2"));
    setNet(readFeatureFlag("netV2"));
    setRemember(getRememberProfile());
    setConsentUi(getConsent());
  }, []);

  const saveNow = () => {
    if (!cleanName(name)) {
      setStatus("Add a name first");
      return;
    }
    if (getConsent() == null) {
      setConsent("accepted");
      setConsentUi("accepted");
    } else if (getConsent() === "essential") {
      setConsent("accepted");
      setConsentUi("accepted");
    }
    const { ok, needsConsent } = saveProfileNow(name, look, cityId);
    setRemember(true);
    if (!ok) setStatus("Couldn’t save — check browser privacy mode");
    else if (needsConsent) setStatus("Saved locally · accept cookies to sync across visits");
    else setStatus("Profile saved on this device");
  };

  return (
    <div className="social-toggles" role="group" aria-label="Settings">
      <p className="toggle-hint">Profile</p>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => {
            const on = e.target.checked;
            setRememberProfile(on);
            setRemember(on);
            if (!on) {
              clearSavedProfile();
              setStatus("Saved profile cleared");
            } else if (cleanName(name)) {
              saveProfileNow(name, look, cityId);
              setStatus("Will remember name & look");
            } else {
              setStatus("Turned on — save after you set a name");
            }
          }}
        />
        <span>Remember my name &amp; look</span>
      </label>
      <div className="settings-actions">
        <button type="button" className="ghost" onClick={saveNow}>
          Save profile now
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            clearSavedProfile();
            setRemember(false);
            setStatus("Profile cleared");
          }}
        >
          Clear saved
        </button>
      </div>
      {consent ? (
        <p className="toggle-hint">
          Cookies: {consent === "accepted" ? "remembering profile" : "essential only"}
          {consent === "essential" ? (
            <>
              {" · "}
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  setConsent("accepted");
                  setConsentUi("accepted");
                  setStatus("Cookies accepted");
                }}
              >
                Allow profile cookies
              </button>
            </>
          ) : null}
        </p>
      ) : (
        <p className="toggle-hint">Accept cookies on the banner to store profile in a cookie too.</p>
      )}
      {status ? <p className="plan-status">{status}</p> : null}

      <p className="toggle-hint">Session</p>
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
      </label>
      <p className="toggle-hint">Session toggles apply on next enter</p>
    </div>
  );
}
