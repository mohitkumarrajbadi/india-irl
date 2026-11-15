/** Shared AudioContext, master bus, mute flags. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let ambientBus: GainNode | null = null;
let engineBus: GainNode | null = null;

let trafficMuted = false;
let speakerMuted = false;
const listeners = new Set<() => void>();

export type AudioUi = { trafficMuted: boolean; speakerMuted: boolean };

export function audioUi(): AudioUi {
  return { trafficMuted, speakerMuted };
}

export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

export function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.88;
    // Soft compressor keeps stacked SFX from clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    master.connect(comp).connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);
    ambientBus = ctx.createGain();
    ambientBus.gain.value = 1;
    ambientBus.connect(master);
    engineBus = ctx.createGain();
    engineBus.gain.value = 1;
    engineBus.connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function masterOut(): GainNode | null {
  return getContext() && master ? master : null;
}

export function sfxOut(): GainNode | null {
  getContext();
  return sfxBus;
}

export function ambientOut(): GainNode | null {
  getContext();
  return ambientBus;
}

export function engineOut(): GainNode | null {
  getContext();
  return engineBus;
}

function applyMutes(): void {
  const ac = ctx;
  if (!ac || !master || !ambientBus) return;
  master.gain.setTargetAtTime(speakerMuted ? 0.0001 : 0.88, ac.currentTime, 0.05);
  ambientBus.gain.setTargetAtTime(trafficMuted || speakerMuted ? 0.0001 : 1, ac.currentTime, 0.2);
}

export function setTrafficMuted(muted: boolean): void {
  trafficMuted = muted;
  applyMutes();
  emit();
}

export function setSpeakerMuted(muted: boolean): void {
  speakerMuted = muted;
  applyMutes();
  emit();
}

export function toggleTrafficMuted(): boolean {
  setTrafficMuted(!trafficMuted);
  return trafficMuted;
}

export function toggleSpeakerMuted(): boolean {
  setSpeakerMuted(!speakerMuted);
  return speakerMuted;
}

export function isTrafficMuted(): boolean {
  return trafficMuted;
}

export function isSpeakerMuted(): boolean {
  return speakerMuted;
}

export function unlockAudio(): void {
  getContext();
}
