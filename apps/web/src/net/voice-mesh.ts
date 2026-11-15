/** WebRTC mesh link lifecycle for proximity voice. */
import type { Wire } from "./transport";
import { ICE, type Link, type PositionalSink, type SendFn } from "./voice-const";
import { dispatchSignal } from "./voice-signal";

export class VoiceMesh {
  readonly links = new Map<string, Link>();
  private stream: MediaStream | null = null;
  private send: SendFn = () => {};
  private selfId = "";
  private positional: PositionalSink | null = null;
  private onChange: () => void = () => {};

  get selfIdPublic(): string {
    return this.selfId;
  }

  configure(selfId: string, send: SendFn, onChange: () => void): void {
    this.selfId = selfId;
    this.send = send;
    this.onChange = onChange;
  }

  notify(): void {
    this.onChange();
  }

  sendWire(msg: Wire): void {
    this.send(msg);
  }

  setStream(stream: MediaStream | null): void {
    this.stream = stream;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  setPositionalSink(sink: PositionalSink | null): void {
    this.positional = sink;
  }

  positionalGain(peerId: string, x: number, z: number, vol: number, stream: MediaStream | null): void {
    this.positional?.onGain(peerId, x, z, vol, stream);
  }

  hasPositional(): boolean {
    return !!this.positional;
  }

  async connect(peerId: string): Promise<void> {
    if (this.links.has(peerId) || !this.stream) return;
    const link = this.makeLink(peerId);
    this.links.set(peerId, link);
    this.onChange();
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

  makeLink(peerId: string): Link {
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
      void audio.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "failed" || st === "closed") this.hangup(peerId, false);
    };
    return link;
  }

  hangup(peerId: string, notify: boolean): void {
    const link = this.links.get(peerId);
    if (!link) return;
    this.links.delete(peerId);
    this.positional?.onDrop(peerId);
    try {
      link.pc.close();
    } catch {
      /* ignore */
    }
    link.audio.srcObject = null;
    link.audio.remove();
    if (notify) this.send({ t: "vx", to: peerId });
    this.onChange();
  }

  handleSignal(msg: Wire, on: boolean): void {
    dispatchSignal(this, msg, on, this.stream);
  }

  hangupAll(notify: boolean): void {
    for (const id of [...this.links.keys()]) this.hangup(id, notify);
  }
}
