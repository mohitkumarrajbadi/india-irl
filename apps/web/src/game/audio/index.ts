/** Public audio API — bus-routed procedural SFX for India IRL. */
export {
  audioUi,
  subscribeAudio,
  setTrafficMuted,
  setSpeakerMuted,
  toggleTrafficMuted,
  toggleSpeakerMuted,
} from "./context.ts";
export { unlockAudio as resumeAudioContext } from "./context.ts";
export { honk } from "./horns.ts";
export { footstep } from "./footsteps.ts";
export { setEngine } from "./engine.ts";
export { chaiSip, crashCue, emoteCue, hitCue, swingCue, wastedCue } from "./cues.ts";
export { setAmbient, stopAmbient, tickDistantTraffic } from "./ambient.ts";
export { setRainAmbience } from "./rain.ts";

import { unlockAudio as resume } from "./context.ts";
import { refreshAmbientAfterUnlock, stopAmbient } from "./ambient.ts";
import { setEngine } from "./engine.ts";
import { refreshRainAfterUnlock, setRainAmbience } from "./rain.ts";

/** Resume Web Audio + rebuild city bed after first user gesture. */
export function unlockAudio(): void {
  resume();
  refreshAmbientAfterUnlock();
  refreshRainAfterUnlock();
}

/** Silence traffic bed / rain / engine when returning to the homepage. */
export function silenceMenuAudio(): void {
  stopAmbient();
  try {
    setRainAmbience(0);
  } catch {
    /* ignore */
  }
  setEngine(0, 0);
}
