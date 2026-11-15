/** Procedural rain bed layered under district ambient. */
import { ambientOut, getContext, isSpeakerMuted, isTrafficMuted } from "./context.ts";
import { makeNoiseLoop } from "./synth.ts";

let rainGain: GainNode | null = null;
let nodes: AudioNode[] = [];
let level = -1;

function teardown(): void {
  for (const n of nodes) {
    try {
      (n as AudioBufferSourceNode).stop?.();
    } catch {
      /* ignore */
    }
    try {
      n.disconnect();
    } catch {
      /* ignore */
    }
  }
  nodes = [];
  rainGain?.disconnect();
  rainGain = null;
  level = -1;
}

/** intensity 0…1 — builds a soft high-frequency rain hiss. */
export function setRainAmbience(intensity: number): void {
  const ac = getContext();
  const dest = ambientOut();
  if (!ac || !dest) return;
  const muted = isTrafficMuted() || isSpeakerMuted();
  const want = muted ? 0 : Math.max(0, Math.min(1, intensity));

  if (want < 0.04) {
    if (rainGain) {
      rainGain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.4);
      if (want <= 0) {
        // keep graph warm briefly
      }
    }
    level = want;
    return;
  }

  if (!rainGain) {
    rainGain = ac.createGain();
    rainGain.gain.value = 0.0001;
    rainGain.connect(dest);
    const noise = ac.createBufferSource();
    noise.buffer = makeNoiseLoop(ac, 1.6);
    noise.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2800;
    bp.Q.value = 0.55;
    const ng = ac.createGain();
    ng.gain.value = 0.55;
    noise.connect(bp).connect(ng).connect(rainGain);
    noise.start();
    nodes.push(noise, bp, ng);
  }

  const vol = 0.02 + want * 0.09;
  rainGain.gain.setTargetAtTime(vol, ac.currentTime, 0.5);
  level = want;
}

export function refreshRainAfterUnlock(): void {
  if (level < 0) return;
  const prev = level;
  teardown();
  setRainAmbience(prev);
}
