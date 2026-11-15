/**
 * Layered vehicle engine bed: tone + grit noise + RPM tracking.
 * kind 0 stops; 1 auto, 2 scooter, 3 cab.
 */
import { engineOut, getContext, sfxOut } from "./context.ts";
import { makeNoiseLoop, tone } from "./synth.ts";

let osc: OscillatorNode | null = null;
let noise: AudioBufferSourceNode | null = null;
let gain: GainNode | null = null;
let noiseGain: GainNode | null = null;
let kind = -1;
let lastStart = 0;

function stopEngine(): void {
  try {
    osc?.stop();
  } catch {
    /* already */
  }
  try {
    noise?.stop();
  } catch {
    /* already */
  }
  osc?.disconnect();
  noise?.disconnect();
  gain?.disconnect();
  noiseGain?.disconnect();
  osc = null;
  noise = null;
  gain = null;
  noiseGain = null;
  kind = -1;
}

export function setEngine(next: number, speed: number): void {
  const ac = getContext();
  const dest = engineOut();
  if (!ac || !dest) return;
  if (next <= 0) {
    stopEngine();
    return;
  }
  if (kind !== next || !osc || !gain) {
    stopEngine();
    kind = next;
    gain = ac.createGain();
    gain.gain.value = 0.0001;
    gain.connect(dest);

    osc = ac.createOscillator();
    osc.type = next === 2 ? "sawtooth" : "triangle";
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = next === 1 ? 520 : next === 2 ? 1100 : 400;
    osc.connect(lp).connect(gain);
    osc.frequency.value = next === 1 ? 92 : next === 2 ? 150 : 74;
    osc.start();

    noise = ac.createBufferSource();
    noise.buffer = makeNoiseLoop(ac, 1.2);
    noise.loop = true;
    const nlp = ac.createBiquadFilter();
    nlp.type = "bandpass";
    nlp.frequency.value = next === 2 ? 700 : 320;
    nlp.Q.value = 0.6;
    noiseGain = ac.createGain();
    noiseGain.gain.value = 0.0001;
    noise.connect(nlp).connect(noiseGain).connect(gain);
    noise.start();

    const now = performance.now();
    if (now - lastStart > 380) {
      lastStart = now;
      const chirp = sfxOut();
      if (chirp) {
        tone(ac, chirp, {
          f: next === 2 ? 440 : 190,
          at: 0,
          len: 0.11,
          type: "square",
          vol: 0.045,
          lp: 1400,
        });
      }
    }
  }
  const base = next === 1 ? 92 : next === 2 ? 150 : 74;
  const rpm = base + Math.abs(speed) * (next === 2 ? 6.4 : 3.4);
  osc!.frequency.setTargetAtTime(rpm, ac.currentTime, 0.07);
  const vol = 0.03 + Math.min(0.055, Math.abs(speed) * 0.0042);
  gain!.gain.setTargetAtTime(vol, ac.currentTime, 0.1);
  noiseGain?.gain.setTargetAtTime(0.35 + Math.min(0.45, Math.abs(speed) * 0.03), ac.currentTime, 0.12);
}
