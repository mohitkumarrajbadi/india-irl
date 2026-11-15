/** One-shot gameplay cues: emotes, hits, crashes, wasted. */
import { getContext, sfxOut } from "./context.ts";
import { noiseBurst, tone } from "./synth.ts";

export function chaiSip(): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.11;
  bus.connect(dest);
  tone(ac, bus, { f: 2100, at: 0, len: 0.035, type: "triangle", vol: 0.75, lp: 4500 });
  tone(ac, bus, { f: 2650, at: 0.028, len: 0.028, type: "sine", vol: 0.4 });
  tone(ac, bus, { f: 210, at: 0.1, len: 0.2, type: "sine", vol: 0.32, lp: 700 });
  noiseBurst(ac, bus, { at: 0.12, len: 0.08, vol: 0.15, freq: 400, type: "lowpass" });
}

/** Whoosh at the start of a punch (0) or kick (1). */
export function swingCue(kind: 0 | 1 = 0): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = kind === 1 ? 0.11 : 0.09;
  bus.connect(dest);
  noiseBurst(ac, bus, { len: kind === 1 ? 0.1 : 0.07, vol: 0.85, freq: kind === 1 ? 520 : 900, q: 0.55, type: "bandpass" });
  tone(ac, bus, {
    f: kind === 1 ? 180 : 260,
    at: 0,
    len: kind === 1 ? 0.09 : 0.06,
    type: "triangle",
    vol: 0.45,
    lp: 1400,
    slide: kind === 1 ? 90 : 140,
  });
}

export function hitCue(power = 1): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.16 * Math.min(1.55, power);
  bus.connect(dest);
  noiseBurst(ac, bus, { len: 0.07, vol: 1, freq: 160, q: 0.35, type: "lowpass" });
  noiseBurst(ac, bus, { len: 0.04, vol: 0.55, freq: 1100, q: 0.8, at: 0.01 });
  tone(ac, bus, { f: 88, at: 0, len: 0.08, type: "square", vol: 0.9, lp: 360, slide: 48 });
  tone(ac, bus, { f: 220, at: 0.012, len: 0.05, type: "triangle", vol: 0.55, lp: 950 });
  tone(ac, bus, { f: 55, at: 0.02, len: 0.12, type: "sine", vol: 0.55, lp: 160 });
}

export function crashCue(power = 1): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.18 * Math.min(1.55, power);
  bus.connect(dest);
  noiseBurst(ac, bus, { len: 0.16, vol: 1, freq: 220, q: 0.35, type: "lowpass" });
  noiseBurst(ac, bus, { len: 0.08, vol: 0.55, freq: 1400, q: 0.7, at: 0.02 });
  tone(ac, bus, { f: 62, at: 0, len: 0.16, type: "square", vol: 0.9, lp: 260, slide: 38 });
  tone(ac, bus, { f: 150, at: 0.03, len: 0.1, type: "sawtooth", vol: 0.55, lp: 650 });
  tone(ac, bus, { f: 42, at: 0.05, len: 0.28, type: "sine", vol: 0.8, lp: 140 });
}

export function wastedCue(): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.22;
  bus.connect(dest);
  tone(ac, bus, { f: 110, at: 0, len: 0.4, type: "sine", vol: 0.85, lp: 420, slide: 55 });
  tone(ac, bus, { f: 72, at: 0.1, len: 0.55, type: "triangle", vol: 0.65, lp: 240 });
  noiseBurst(ac, bus, { at: 0.05, len: 0.35, vol: 0.4, freq: 120, type: "lowpass" });
}

export function emoteCue(kind: number): void {
  const ac = getContext();
  const dest = sfxOut();
  if (!ac || !dest || kind <= 0) return;
  if (kind === 4) {
    chaiSip();
    return;
  }
  if (kind === 5 || kind === 6) {
    swingCue(kind === 6 ? 1 : 0);
    return;
  }
  const bus = ac.createGain();
  bus.gain.value = 0.08;
  bus.connect(dest);
  const dance = kind === 3 || kind >= 7;
  const f = kind === 1 ? 540 : kind === 2 ? 390 : dance ? 700 + (kind % 3) * 40 : 660;
  tone(ac, bus, { f, at: 0, len: dance ? 0.12 : 0.09, type: "sine", vol: 0.7, lp: 2000 });
  tone(ac, bus, { f: f * 1.48, at: 0.04, len: dance ? 0.14 : 0.11, type: "triangle", vol: 0.38, lp: 2400 });
  if (dance) tone(ac, bus, { f: f * 0.5, at: 0.02, len: 0.16, type: "triangle", vol: 0.28, lp: 1200 });
}
