let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambientGain: GainNode | null = null;
let ambientNodes: AudioNode[] = [];
let ambientKind = "";
let footPhase = 0;
let lastFoot = 0;
let lastDistant = 0;
let lastEngine = 0;
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineKind = -1;
/** City bed + distant horns. */
let trafficMuted = false;
/** All local game SFX (horns, footsteps, engine, emotes). Voice is separate. */
let speakerMuted = false;
const audioListeners = new Set<() => void>();

export type AudioUi = { trafficMuted: boolean; speakerMuted: boolean };

export function audioUi(): AudioUi {
  return { trafficMuted, speakerMuted };
}

export function subscribeAudio(fn: () => void): () => void {
  audioListeners.add(fn);
  return () => audioListeners.delete(fn);
}

function emitAudio(): void {
  for (const fn of audioListeners) fn();
}

function applyMasterMute(): void {
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(speakerMuted ? 0.0001 : 0.85, ctx.currentTime, 0.05);
}

function applyTrafficMute(): void {
  if (!ambientGain || !ctx) return;
  ambientGain.gain.setTargetAtTime(trafficMuted ? 0.0001 : 0.045, ctx.currentTime, 0.2);
}

export function setTrafficMuted(muted: boolean): void {
  trafficMuted = muted;
  applyTrafficMute();
  emitAudio();
}

export function setSpeakerMuted(muted: boolean): void {
  speakerMuted = muted;
  applyMasterMute();
  emitAudio();
}

export function toggleTrafficMuted(): boolean {
  setTrafficMuted(!trafficMuted);
  return trafficMuted;
}

export function toggleSpeakerMuted(): boolean {
  setSpeakerMuted(!speakerMuted);
  return speakerMuted;
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function out(): GainNode | null {
  const ac = context();
  return ac && master ? master : null;
}

function beep(
  ac: AudioContext,
  dest: AudioNode,
  opts: { f: number; at: number; len: number; type?: OscillatorType; vol?: number; lp?: number },
): void {
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = opts.type ?? "sawtooth";
  osc.frequency.value = opts.f;
  const g = ac.createGain();
  const vol = opts.vol ?? 1;
  g.gain.setValueAtTime(0.0001, now + opts.at);
  g.gain.exponentialRampToValueAtTime(vol, now + opts.at + 0.012);
  g.gain.setValueAtTime(vol, now + opts.at + opts.len);
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.at + opts.len + 0.04);
  if (opts.lp) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opts.lp;
    osc.connect(lp).connect(g).connect(dest);
  } else {
    osc.connect(g).connect(dest);
  }
  osc.start(now + opts.at);
  osc.stop(now + opts.at + opts.len + 0.08);
}

/** Synthesised horns: no assets to download. kind 1 auto, 2 bike, 3 cab. */
export function honk(kind: number, volume = 1): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest || volume < 0.02) return;
  const bus = ac.createGain();
  bus.gain.value = 0.14 * volume;
  bus.connect(dest);
  const beeps: { at: number; len: number; f: number }[] =
    kind === 1
      ? [
          { at: 0, len: 0.11, f: 520 },
          { at: 0.17, len: 0.15, f: 520 },
        ]
      : kind === 2
        ? [{ at: 0, len: 0.13, f: 760 }]
        : [
            { at: 0, len: 0.2, f: 330 },
            { at: 0.26, len: 0.26, f: 330 },
          ];
  for (const b of beeps) {
    beep(ac, bus, { f: b.f, at: b.at, len: b.len, lp: 2400 });
    beep(ac, bus, { f: b.f * 1.26, at: b.at, len: b.len, vol: 0.7, lp: 2400 });
  }
}

/** Soft grit footstep. Call from the frame loop with ground speed. */
export function footstep(speed: number, dt: number): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest || speed < 0.6) {
    footPhase = 0;
    return;
  }
  const pace = Math.min(speed / 4.2, 1.8);
  footPhase += dt * (5.2 + pace * 4.5);
  if (footPhase < Math.PI) return;
  footPhase %= Math.PI;
  const now = performance.now();
  if (now - lastFoot < 90) return;
  lastFoot = now;

  const bus = ac.createGain();
  bus.gain.value = 0.045 * Math.min(1, pace);
  bus.connect(dest);
  const noise = ac.createBufferSource();
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
  noise.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 280 + pace * 120;
  bp.Q.value = 0.7;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(1, ac.currentTime + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05);
  noise.connect(bp).connect(g).connect(bus);
  noise.start();
}

/** Chai cup clink + soft sip for the chai emote. */
export function chaiSip(): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.1;
  bus.connect(dest);
  beep(ac, bus, { f: 1800, at: 0, len: 0.04, type: "triangle", vol: 0.8, lp: 4000 });
  beep(ac, bus, { f: 2400, at: 0.03, len: 0.03, type: "sine", vol: 0.5 });
  beep(ac, bus, { f: 220, at: 0.12, len: 0.18, type: "sine", vol: 0.35, lp: 800 });
}

/** Soft whoosh for wave / namaste / bhangra starts. */
export function emoteCue(kind: number): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest || kind <= 0) return;
  if (kind === 4) {
    chaiSip();
    return;
  }
  if (kind === 5 || kind === 6) {
    hitCue(kind === 6 ? 1.15 : 1);
    return;
  }
  const bus = ac.createGain();
  bus.gain.value = 0.07;
  bus.connect(dest);
  const f = kind === 1 ? 520 : kind === 2 ? 380 : 640;
  beep(ac, bus, { f, at: 0, len: 0.08, type: "sine", vol: 0.7, lp: 1800 });
  beep(ac, bus, { f: f * 1.5, at: 0.04, len: 0.1, type: "triangle", vol: 0.4, lp: 2200 });
}

/** Punch / kick impact (also played when you get hit). */
export function hitCue(power = 1): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.12 * Math.min(1.4, power);
  bus.connect(dest);
  beep(ac, bus, { f: 90, at: 0, len: 0.07, type: "square", vol: 0.9, lp: 400 });
  beep(ac, bus, { f: 220, at: 0.02, len: 0.05, type: "triangle", vol: 0.55, lp: 900 });
  beep(ac, bus, { f: 60, at: 0.04, len: 0.12, type: "sine", vol: 0.7, lp: 200 });
}

/** Metal crunch for vehicle impacts — cheap 3-beep stack. */
export function crashCue(power = 1): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.16 * Math.min(1.5, power);
  bus.connect(dest);
  beep(ac, bus, { f: 55, at: 0, len: 0.14, type: "square", vol: 1, lp: 280 });
  beep(ac, bus, { f: 140, at: 0.02, len: 0.08, type: "sawtooth", vol: 0.7, lp: 700 });
  beep(ac, bus, { f: 38, at: 0.06, len: 0.2, type: "sine", vol: 0.85, lp: 160 });
}

/** Low sting when KHATAM triggers. */
export function wastedCue(): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest) return;
  const bus = ac.createGain();
  bus.gain.value = 0.2;
  bus.connect(dest);
  beep(ac, bus, { f: 90, at: 0, len: 0.35, type: "sine", vol: 0.9, lp: 400 });
  beep(ac, bus, { f: 60, at: 0.08, len: 0.55, type: "triangle", vol: 0.7, lp: 220 });
  beep(ac, bus, { f: 180, at: 0.2, len: 0.25, type: "sawtooth", vol: 0.35, lp: 500 });
}

/** Vehicle engine bed while driving. kind 0 stops it. */
export function setEngine(kind: number, speed: number): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest) return;
  if (kind <= 0) {
    if (engineOsc) {
      try {
        engineOsc.stop();
      } catch {
        /* already stopped */
      }
      engineOsc.disconnect();
      engineGain?.disconnect();
      engineOsc = null;
      engineGain = null;
      engineKind = -1;
    }
    return;
  }
  if (engineKind !== kind || !engineOsc || !engineGain) {
    if (engineOsc) {
      try {
        engineOsc.stop();
      } catch {
        /* ignore */
      }
      engineOsc.disconnect();
      engineGain?.disconnect();
    }
    engineKind = kind;
    engineGain = ac.createGain();
    engineGain.gain.value = 0.0001;
    engineGain.connect(dest);
    engineOsc = ac.createOscillator();
    engineOsc.type = kind === 2 ? "sawtooth" : "triangle";
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = kind === 1 ? 480 : kind === 2 ? 900 : 360;
    engineOsc.connect(lp).connect(engineGain);
    engineOsc.frequency.value = kind === 1 ? 88 : kind === 2 ? 140 : 70;
    engineOsc.start();
    const now = performance.now();
    if (now - lastEngine > 400) {
      lastEngine = now;
      // Short starter chirp.
      beep(ac, dest, { f: kind === 2 ? 420 : 180, at: 0, len: 0.12, type: "square", vol: 0.05, lp: 1200 });
    }
  }
  const base = kind === 1 ? 88 : kind === 2 ? 140 : 70;
  const target = base + Math.abs(speed) * (kind === 2 ? 6 : 3.2);
  engineOsc.frequency.setTargetAtTime(target, ac.currentTime, 0.08);
  const vol = 0.028 + Math.min(0.05, Math.abs(speed) * 0.004);
  engineGain.gain.setTargetAtTime(vol, ac.currentTime, 0.12);
}

function stopAmbient(): void {
  for (const n of ambientNodes) {
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
  ambientNodes = [];
  ambientGain?.disconnect();
  ambientGain = null;
  ambientKind = "";
}

/**
 * Soft looping city bed. `kind` is a district hint:
 * market | tech | park | night | day
 */
export function setAmbient(kind: string, volume = 1): void {
  const ac = context();
  const dest = out();
  if (!ac || !dest) return;
  if (kind === ambientKind && ambientGain) {
    ambientGain.gain.setTargetAtTime(trafficMuted ? 0.0001 : 0.045 * volume, ac.currentTime, 0.5);
    return;
  }
  stopAmbient();
  ambientKind = kind;
  ambientGain = ac.createGain();
  ambientGain.gain.value = 0.0001;
  ambientGain.connect(dest);
  const target = trafficMuted ? 0.0001 : 0.045 * volume;
  ambientGain.gain.setTargetAtTime(target, ac.currentTime, 0.8);

  // Broadband traffic rumble.
  const noise = ac.createBufferSource();
  const secs = 2;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * secs), ac.sampleRate);
  const data = buf.getChannelData(0);
  let prev = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    prev = prev * 0.97 + white * 0.03;
    data[i] = prev;
  }
  noise.buffer = buf;
  noise.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = kind === "park" ? 220 : kind === "night" ? 280 : kind === "market" ? 520 : 380;
  const ng = ac.createGain();
  ng.gain.value = kind === "park" ? 0.35 : kind === "market" ? 0.85 : 0.65;
  noise.connect(lp).connect(ng).connect(ambientGain);
  noise.start();
  ambientNodes.push(noise, lp, ng);

  // Soft tonal bed for tech parks / night.
  if (kind === "tech" || kind === "night") {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = kind === "night" ? 110 : 92;
    const og = ac.createGain();
    og.gain.value = 0.22;
    osc.connect(og).connect(ambientGain);
    osc.start();
    ambientNodes.push(osc, og);
  }

  // Market murmur: two slow beating tones.
  if (kind === "market") {
    for (const f of [180, 210]) {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const og = ac.createGain();
      og.gain.value = 0.12;
      const mlp = ac.createBiquadFilter();
      mlp.type = "lowpass";
      mlp.frequency.value = 600;
      osc.connect(mlp).connect(og).connect(ambientGain);
      osc.start();
      ambientNodes.push(osc, mlp, og);
    }
  }

  // Park daytime birds: sparse high chirps via LFO-gated sine.
  if (kind === "park") {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 2400;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.35;
    const lfoG = ac.createGain();
    lfoG.gain.value = 0.18;
    const og = ac.createGain();
    og.gain.value = 0.0001;
    lfo.connect(lfoG).connect(og.gain);
    osc.connect(og).connect(ambientGain);
    osc.start();
    lfo.start();
    ambientNodes.push(osc, lfo, lfoG, og);
  }
}

/** Occasional distant AI-traffic honk so the street feels busy. */
export function tickDistantTraffic(night: number, dt: number): void {
  if (trafficMuted || speakerMuted) return;
  lastDistant += dt;
  const gap = night > 0.6 ? 9 : 4.5;
  if (lastDistant < gap + Math.random() * 3) return;
  lastDistant = 0;
  const kind = Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 3 : 2;
  honk(kind, 0.12 + Math.random() * 0.12);
}

export function unlockAudio(): void {
  const ac = context();
  if (!ac) return;
  // Recreate the ambient bed after the first gesture if it was started while suspended.
  if (ambientKind && ambientGain && ac.state === "running") {
    ambientGain.gain.setTargetAtTime(0.045, ac.currentTime, 0.3);
  } else if (ambientKind && ac.state === "running" && !ambientGain) {
    const kind = ambientKind;
    ambientKind = "";
    setAmbient(kind, 1);
  }
}
