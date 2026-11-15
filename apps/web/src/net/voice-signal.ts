/** Offer / answer / ICE handlers for VoiceMesh. */
import type { Wire } from "./transport";
import type { Link } from "./voice-const";
import type { VoiceMesh } from "./voice-mesh";

export async function handleOffer(mesh: VoiceMesh, from: string, sdp: string, stream: MediaStream | null): Promise<void> {
  if (!sdp || !stream) return;
  let link = mesh.links.get(from);
  if (!link) {
    link = mesh.makeLink(from);
    mesh.links.set(from, link);
    mesh.notify();
  }
  const offerCollision = link.makingOffer || link.pc.signalingState !== "stable";
  link.ignoreOffer = !link.polite && offerCollision;
  if (link.ignoreOffer) return;
  try {
    await link.pc.setRemoteDescription({ type: "offer", sdp });
    await link.pc.setLocalDescription(await link.pc.createAnswer());
    mesh.sendWire({ t: "va", to: from, sdp: link.pc.localDescription?.sdp ?? "" });
  } catch {
    mesh.hangup(from, true);
  }
}

export async function handleAnswer(mesh: VoiceMesh, from: string, sdp: string): Promise<void> {
  const link = mesh.links.get(from);
  if (!link || !sdp) return;
  try {
    await link.pc.setRemoteDescription({ type: "answer", sdp });
  } catch {
    mesh.hangup(from, true);
  }
}

export async function handleIce(mesh: VoiceMesh, from: string, candidate: unknown): Promise<void> {
  const link = mesh.links.get(from);
  if (!link) return;
  try {
    if (candidate) await link.pc.addIceCandidate(candidate as RTCIceCandidateInit);
    else await link.pc.addIceCandidate();
  } catch {
    /* ignore late ICE */
  }
}

export function dispatchSignal(mesh: VoiceMesh, msg: Wire, on: boolean, stream: MediaStream | null): void {
  const from = typeof msg.id === "string" ? msg.id : "";
  const to = typeof msg.to === "string" ? msg.to : "";
  if (!from || (to && to !== mesh.selfIdPublic)) return;
  if (msg.t === "vx") {
    mesh.hangup(from, false);
    return;
  }
  if (!on || !stream) return;
  if (msg.t === "vo") void handleOffer(mesh, from, String(msg.sdp ?? ""), stream);
  else if (msg.t === "va") void handleAnswer(mesh, from, String(msg.sdp ?? ""));
  else if (msg.t === "vi") void handleIce(mesh, from, msg.candidate);
}

export type { Link };
