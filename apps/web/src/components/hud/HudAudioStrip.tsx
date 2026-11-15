"use client";

import { useEffect, useState } from "react";
import { audioUi, setTrafficMuted, subscribeAudio, unlockAudio } from "@/game/audio";
import { toast as pushToast } from "@/game/store";
import { voice, VOICE_RANGE } from "@/net/voice";
import { FullscreenButton } from "./FullscreenButton";

export function HudAudioStrip() {
  const [voiceUi, setVoiceUi] = useState(voice.ui());
  const [aud, setAud] = useState(audioUi());
  const [speakerOff, setSpeakerOff] = useState(voice.speakerMuted);

  useEffect(() => voice.subscribe(() => {
    setVoiceUi(voice.ui());
    setSpeakerOff(voice.speakerMuted);
  }), []);
  useEffect(() => subscribeAudio(() => setAud(audioUi())), []);

  return (
    <div className="audio-strip" role="group" aria-label="Audio">
      <button
        type="button"
        className={aud.trafficMuted ? "strip-btn off" : "strip-btn"}
        title="City traffic bed + distant horns"
        onClick={() => {
          unlockAudio();
          setTrafficMuted(!aud.trafficMuted);
          pushToast(aud.trafficMuted ? "Traffic on" : "Traffic muted");
        }}
      >
        Traffic
      </button>
      <button
        type="button"
        className={speakerOff ? "strip-btn off" : "strip-btn"}
        title="Hear nearby voice chat"
        onClick={() => {
          unlockAudio();
          const next = voice.toggleSpeakerMuted();
          setSpeakerOff(next);
          pushToast(next ? "Speaker muted" : "Speaker on");
        }}
      >
        Speaker
      </button>
      <button
        type="button"
        className={`strip-btn ${voiceUi.on ? (voiceUi.muted ? "off" : "live") : ""}`}
        title="Mic on/mute · right-click to fully disable voice"
        onClick={() => {
          unlockAudio();
          if (!voiceUi.on) {
            void voice.enable().then(() => {
              if (voice.error) pushToast(voice.error);
              else pushToast(`Mic live · ${VOICE_RANGE} m`);
            });
          } else {
            voice.setMuted(!voiceUi.muted);
            pushToast(voice.muted ? "Mic muted" : "Mic live");
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (voiceUi.on) {
            voice.disable();
            pushToast("Voice off");
          }
        }}
      >
        {!voiceUi.on ? "Mic" : voiceUi.muted ? "Mic ·" : "Mic"}
      </button>
      <FullscreenButton />
    </div>
  );
}
