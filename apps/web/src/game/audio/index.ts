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
export { setAmbient, tickDistantTraffic } from "./ambient.ts";
export { setRainAmbience } from "./rain.ts";

import { unlockAudio as resume } from "./context.ts";
import { refreshAmbientAfterUnlock } from "./ambient.ts";
import { refreshRainAfterUnlock } from "./rain.ts";

/** Resume Web Audio + rebuild city bed after first user gesture. */
export function unlockAudio(): void {
  resume();
  refreshAmbientAfterUnlock();
  refreshRainAfterUnlock();
}
