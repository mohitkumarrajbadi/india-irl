/**
 * District ambient beds + occasional distant horns.
 * kind: market | tech | park | night | day
 */
import { ambientOut, getContext, isSpeakerMuted, isTrafficMuted } from "./context.ts";
import { honk } from "./horns.ts";
import { makeNoiseLoop } from "./synth.ts";

let nodes: AudioNode[] = [];
let bedGain: GainNode | null = null;
let kind = "";
let distantAcc = 0;

function stopBed(): void {
  for (const n of nodes) {
    try {
      (n as OscillatorNode).stop?.();
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
  bedGain?.disconnect();
  bedGain = null;
  kind = "";
}

export function setAmbient(next: string, volume = 1): void {
  const ac = getContext();
  const dest = ambientOut();
  if (!ac || !dest) return;
  if (next === kind && bedGain) {
    const t = isTrafficMuted() || isSpeakerMuted() ? 0.0001 : 0.05 * volume;
    bedGain.gain.setTargetAtTime(t, ac.currentTime, 0.45);
    return;
  }
  stopBed();
  kind = next;
  bedGain = ac.createGain();
  bedGain.gain.value = 0.0001;
  bedGain.connect(dest);
  const target = isTrafficMuted() || isSpeakerMuted() ? 0.0001 : 0.05 * volume;
  bedGain.gain.setTargetAtTime(target, ac.currentTime, 0.75);

  const noise = ac.createBufferSource();
  noise.buffer = makeNoiseLoop(ac, 2.2);
  noise.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = next === "park" ? 240 : next === "night" ? 300 : next === "market" ? 560 : 400;
  const ng = ac.createGain();
  ng.gain.value = next === "park" ? 0.32 : next === "market" ? 0.88 : 0.62;
  noise.connect(lp).connect(ng).connect(bedGain);
  noise.start();
  nodes.push(noise, lp, ng);

  if (next === "tech" || next === "night") {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = next === "night" ? 108 : 90;
    const og = ac.createGain();
    og.gain.value = 0.2;
    osc.connect(og).connect(bedGain);
    osc.start();
    nodes.push(osc, og);
  }

  if (next === "market") {
    for (const f of [172, 205, 238]) {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const mlp = ac.createBiquadFilter();
      mlp.type = "lowpass";
      mlp.frequency.value = 650;
      const og = ac.createGain();
      og.gain.value = 0.1;
      osc.connect(mlp).connect(og).connect(bedGain);
      osc.start();
      nodes.push(osc, mlp, og);
    }
  }

  if (next === "park") {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 2650;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.28;
    const lfoG = ac.createGain();
    lfoG.gain.value = 0.16;
    const og = ac.createGain();
    og.gain.value = 0.0001;
    lfo.connect(lfoG).connect(og.gain);
    osc.connect(og).connect(bedGain);
    osc.start();
    lfo.start();
    nodes.push(osc, lfo, lfoG, og);
  }
}

export function tickDistantTraffic(night: number, dt: number): void {
  if (isTrafficMuted() || isSpeakerMuted()) return;
  distantAcc += dt;
  const gap = night > 0.6 ? 8.5 : 4.2;
  if (distantAcc < gap + Math.random() * 3.5) return;
  distantAcc = 0;
  const k = Math.random() < 0.42 ? 1 : Math.random() < 0.68 ? 3 : 2;
  honk(k, 0.1 + Math.random() * 0.14);
}

export function refreshAmbientAfterUnlock(): void {
  if (!kind) return;
  const prev = kind;
  kind = "";
  setAmbient(prev, 1);
}
