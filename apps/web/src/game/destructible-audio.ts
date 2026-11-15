/** Material break cues for destructible props. */
import { getContext, sfxOut } from "./audio/context.ts";
import { noiseBurst, tone } from "./audio/synth.ts";
import type { DestMaterial } from "./destructible-catalog.ts";

export function breakCue(material: DestMaterial, power = 1): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.14 * Math.min(1.4, 0.55 + power);
  bus.connect(dest);
  if (material === "wood") {
    noiseBurst(ac, bus, { len: 0.12, vol: 1, freq: 380, q: 0.45, type: "bandpass" });
    tone(ac, bus, { f: 140, at: 0, len: 0.08, type: "triangle", vol: 0.7, lp: 800, slide: 60 });
    tone(ac, bus, { f: 420, at: 0.02, len: 0.05, type: "square", vol: 0.35, lp: 1600 });
  } else if (material === "plastic") {
    noiseBurst(ac, bus, { len: 0.09, vol: 0.9, freq: 900, q: 0.7, type: "bandpass" });
    tone(ac, bus, { f: 520, at: 0, len: 0.06, type: "square", vol: 0.55, lp: 2400, slide: 180 });
  } else if (material === "metal") {
    noiseBurst(ac, bus, { len: 0.1, vol: 0.85, freq: 600, q: 0.5, type: "bandpass" });
    tone(ac, bus, { f: 220, at: 0, len: 0.14, type: "sawtooth", vol: 0.45, lp: 1800, slide: -80 });
    tone(ac, bus, { f: 880, at: 0.02, len: 0.08, type: "triangle", vol: 0.35, lp: 3200 });
  } else {
    noiseBurst(ac, bus, { len: 0.11, vol: 0.8, freq: 280, q: 0.4, type: "lowpass" });
    tone(ac, bus, { f: 90, at: 0, len: 0.1, type: "sine", vol: 0.5, lp: 400 });
  }
}
