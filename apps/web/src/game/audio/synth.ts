/** Low-level Web Audio primitives used by all cues. */

export function tone(
  ac: AudioContext,
  dest: AudioNode,
  opts: {
    f: number;
    at?: number;
    len: number;
    type?: OscillatorType;
    vol?: number;
    lp?: number;
    slide?: number;
  },
): void {
  const t0 = ac.currentTime + (opts.at ?? 0);
  const osc = ac.createOscillator();
  osc.type = opts.type ?? "sawtooth";
  osc.frequency.setValueAtTime(opts.f, t0);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + opts.len);
  const g = ac.createGain();
  const vol = opts.vol ?? 1;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.setValueAtTime(vol, t0 + opts.len * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.len + 0.04);
  if (opts.lp) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opts.lp;
    osc.connect(lp).connect(g).connect(dest);
  } else {
    osc.connect(g).connect(dest);
  }
  osc.start(t0);
  osc.stop(t0 + opts.len + 0.08);
}

/** One-shot noise burst with envelope (footsteps, crashes, grit). */
export function noiseBurst(
  ac: AudioContext,
  dest: AudioNode,
  opts: { len: number; vol?: number; freq?: number; q?: number; at?: number; type?: BiquadFilterType },
): void {
  const t0 = ac.currentTime + (opts.at ?? 0);
  const n = Math.max(32, Math.floor(ac.sampleRate * opts.len));
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.28));
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = opts.type ?? "bandpass";
  bp.frequency.value = opts.freq ?? 400;
  bp.Q.value = opts.q ?? 0.8;
  const g = ac.createGain();
  const vol = opts.vol ?? 1;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.len);
  src.connect(bp).connect(g).connect(dest);
  src.start(t0);
}

/** Pink-ish loop buffer for beds / engines. */
export function makeNoiseLoop(ac: AudioContext, secs = 1.5): AudioBuffer {
  const n = Math.floor(ac.sampleRate * secs);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < n; i += 1) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    data[i] = (b0 + b1 + b2 + w * 0.2) * 0.18;
  }
  return buf;
}
