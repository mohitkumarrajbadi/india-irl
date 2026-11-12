import { live } from "@/game/runtime";
import type { Wire } from "./transport";

type VoiceModeSender = (on: boolean) => void;
let sendVoiceMode: VoiceModeSender = () => {};

/** Wired from net/store so mic state reaches the relay for honest “talking” counts. */
export function setVoiceModeSender(fn: VoiceModeSender): void {
  sendVoiceMode = fn;
}

/** Hear / link only within this radius (meters). */
export const VOICE_RANGE = 28;
const VOICE_RANGE2 = VOICE_RANGE * VOICE_RANGE;
/** Hard cap on simultaneous peer connections. */
export const VOICE_MAX_LINKS = 6;

const ICE: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type VoiceUi = {
  on: boolean;
  muted: boolean;
  linked: number;
  speaking: number;
  error: string;
};

type SendFn = (msg: Wire) => void;

type Link = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
};

/**
 * Proximity voice: small WebRTC mesh, gated by distance.
 * Signaling rides the same relay / BroadcastChannel as game state.
 * Not a full SFU — good for nearby hangouts (≤6 voices). Swap later for LiveKit if needed.
 */
export class VoiceChat {
  on = false;
  muted = true;
  /** Mute hearing others (speaker), independent of mic. */
  speakerMuted = false;
  error = "";
  linked = 0;
  speaking = 0;

  private stream: MediaStream | null = null;
  private links = new Map<string, Link>();
  private send: SendFn = () => {};
  private selfId = "";
  private listeners = new Set<() => void>();

  setSender(selfId: string, send: SendFn): void {
    this.selfId = selfId;
    this.send = send;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.linked = this.links.size;
    for (const fn of this.listeners) fn();
  }

  ui(): VoiceUi {
    return {
      on: this.on,
      muted: this.muted,
      linked: this.linked,
      speaking: this.speaking,
      error: this.error,
    };
  }

  setSpeakerMuted(muted: boolean): void {
    this.speakerMuted = muted;
    for (const link of this.links.values()) {
      if (muted) link.audio.volume = 0;
    }
    this.emit();
  }

  toggleSpeakerMuted(): boolean {
    this.setSpeakerMuted(!this.speakerMuted);
    return this.speakerMuted;
  }

  async enable(): Promise<void> {
    if (this.on) return;
    this.error = "";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.on = true;
      this.muted = false;
      this.applyMute();
      sendVoiceMode(true);
      this.emit();
    } catch {
      this.error = "Mic permission denied";
      this.on = false;
      sendVoiceMode(false);
      this.emit();
    }
  }

  disable(): void {
    this.on = false;
    this.muted = true;
    this.error = "";
    for (const id of [...this.links.keys()]) this.hangup(id, true);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    sendVoiceMode(false);
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMute();
    sendVoiceMode(this.on && !this.muted);
    this.emit();
  }

  toggleMute(): void {
    if (!this.on) void this.enable();
    else this.setMuted(!this.muted);
  }

  private applyMute(): void {
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = this.on && !this.muted;
    });
  }

  /** Call ~4–10 Hz from the game loop with peer positions. */
  tick(peers: { id: string; x: number; z: number }[]): void {
    if (!this.on || !this.stream) {
      if (this.links.size) for (const id of [...this.links.keys()]) this.hangup(id, true);
      return;
    }

    const scores: { id: string; d2: number }[] = [];
    for (const p of peers) {
      const d2 = (p.x - live.x) ** 2 + (p.z - live.z) ** 2;
      if (d2 <= VOICE_RANGE2) scores.push({ id: p.id, d2 });
    }
    scores.sort((a, b) => a.d2 - b.d2);
    const want = new Set(scores.slice(0, VOICE_MAX_LINKS).map((s) => s.id));

    for (const id of [...this.links.keys()]) {
      if (!want.has(id)) this.hangup(id, true);
    }
    for (const id of want) {
      if (!this.links.has(id)) void this.connect(id);
    }

    // Distance → volume.
    let speaking = 0;
    for (const p of peers) {
      const link = this.links.get(p.id);
      if (!link) continue;
      const d = Math.hypot(p.x - live.x, p.z - live.z);
      const vol = this.speakerMuted
        ? 0
        : d >= VOICE_RANGE
          ? 0
          : Math.max(0.05, Math.pow(1 - d / VOICE_RANGE, 1.35));
      link.audio.volume = vol;
      if (!link.audio.paused && vol > 0.08) speaking += 1;
    }
    if (speaking !== this.speaking) {
      this.speaking = speaking;
      this.emit();
    }
  }

  handleSignal(msg: Wire): void {
    const from = typeof msg.id === "string" ? msg.id : "";
    const to = typeof msg.to === "string" ? msg.to : "";
    if (!from || (to && to !== this.selfId)) return;
    if (msg.t === "vx") {
      this.hangup(from, false);
      return;
    }
    if (!this.on || !this.stream) return;
    if (msg.t === "vo") void this.onOffer(from, String(msg.sdp ?? ""));
    else if (msg.t === "va") void this.onAnswer(from, String(msg.sdp ?? ""));
    else if (msg.t === "vi") void this.onIce(from, msg.candidate);
  }

  private async connect(peerId: string): Promise<void> {
    if (this.links.has(peerId) || !this.stream) return;
    const link = this.makeLink(peerId);
    this.links.set(peerId, link);
    this.emit();
    // Only the impolite peer (higher id) starts the offer to avoid glare.
    if (!link.polite) {
      try {
        link.makingOffer = true;
        await link.pc.setLocalDescription(await link.pc.createOffer());
        this.send({ t: "vo", to: peerId, sdp: link.pc.localDescription?.sdp ?? "" });
      } catch {
        this.hangup(peerId, true);
      } finally {
        link.makingOffer = false;
      }
    }
  }

  private makeLink(peerId: string): Link {
    const polite = this.selfId < peerId;
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.setAttribute("playsinline", "true");
    document.body.appendChild(audio);

    const link: Link = { pc, audio, makingOffer: false, ignoreOffer: false, polite };

    for (const track of this.stream!.getAudioTracks()) {
      pc.addTrack(track, this.stream!);
    }

    pc.onicecandidate = (ev) => {
      this.send({ t: "vi", to: peerId, candidate: ev.candidate ? ev.candidate.toJSON() : null });
    };
    pc.ontrack = (ev) => {
      audio.srcObject = ev.streams[0] ?? new MediaStream([ev.track]);
      void audio.play().catch(() => {
        /* autoplay may need a gesture; enabling mic already counts */
      });
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "failed" || st === "closed" || st === "disconnected") {
        // Soft drop on disconnected; hard on failed/closed.
        if (st !== "disconnected") this.hangup(peerId, false);
      }
    };
    return link;
  }

  private async onOffer(from: string, sdp: string): Promise<void> {
    if (!sdp || !this.stream) return;
    let link = this.links.get(from);
    if (!link) {
      link = this.makeLink(from);
      this.links.set(from, link);
      this.emit();
    }
    const offerCollision = link.makingOffer || link.pc.signalingState !== "stable";
    link.ignoreOffer = !link.polite && offerCollision;
    if (link.ignoreOffer) return;
    try {
      await link.pc.setRemoteDescription({ type: "offer", sdp });
      await link.pc.setLocalDescription(await link.pc.createAnswer());
      this.send({ t: "va", to: from, sdp: link.pc.localDescription?.sdp ?? "" });
    } catch {
      this.hangup(from, true);
    }
  }

  private async onAnswer(from: string, sdp: string): Promise<void> {
    const link = this.links.get(from);
    if (!link || !sdp) return;
    try {
      await link.pc.setRemoteDescription({ type: "answer", sdp });
    } catch {
      this.hangup(from, true);
    }
  }

  private async onIce(from: string, candidate: unknown): Promise<void> {
    const link = this.links.get(from);
    if (!link) return;
    try {
      if (candidate) await link.pc.addIceCandidate(candidate as RTCIceCandidateInit);
      else await link.pc.addIceCandidate();
    } catch {
      if (!link.ignoreOffer) {
        /* ignore late ICE */
      }
    }
  }

  private hangup(peerId: string, notify: boolean): void {
    const link = this.links.get(peerId);
    if (!link) return;
    this.links.delete(peerId);
    try {
      link.pc.close();
    } catch {
      /* ignore */
    }
    link.audio.srcObject = null;
    link.audio.remove();
    if (notify) this.send({ t: "vx", to: peerId });
    this.emit();
  }
}

export const voice = new VoiceChat();
