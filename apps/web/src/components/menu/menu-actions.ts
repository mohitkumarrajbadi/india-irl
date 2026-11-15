/** Enter / invite / plan actions for the character menu. */
import { cleanName, type Look } from "@/avatar/appearance";
import { advanceStep, loadOnboard } from "@/game/onboarding";
import { grantMission, saveProfile, useGame } from "@/game/store";
import { loadVibe, noteSession, type VibeState } from "@/game/vibe";
import { createPlan, joinPlan, type PlanInfo } from "@/net/stats";
import { CITIES } from "@/world/cities";
import { buildShareUrl, whatsappShareText } from "@/world/meets";
import type { CityId } from "@/world/types";

export function enterGame(name: string, look: Look, cityId: CityId, vibe: VibeState): void {
  const clean = cleanName(name);
  if (!clean) return;
  saveProfile(clean, look, cityId);
  noteSession(vibe);
  grantMission("enter");
  const board = loadOnboard();
  if (board.step === "customize") advanceStep("enter");
  const planId = useGame.getState().planId;
  if (planId) void joinPlan(planId, clean);
  useGame.setState({ name: clean, phase: "playing", vibe: loadVibe() });
}

export function inviteUrl(cityId: CityId, meetId: string | null, plan?: string): string {
  return buildShareUrl({
    origin: window.location.origin + "/",
    city: cityId,
    meet: meetId,
    plan,
  });
}

export async function copyInviteLink(
  cityId: CityId,
  meetId: string | null,
  onFlash: (msg: string) => void,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(inviteUrl(cityId, meetId));
    onFlash("Invite copied · drop it in the group chat");
    return true;
  } catch {
    onFlash("Copy failed — share the URL from the address bar");
    return false;
  }
}

export function openWhatsAppShare(args: {
  cityId: CityId;
  meetId: string | null;
  place: string;
  here: number;
  talking: number;
}): void {
  const city = CITIES[args.cityId];
  const text = whatsappShareText({
    cityName: city.name,
    meetLabel: args.meetId ? args.place : null,
    here: args.here,
    talking: args.talking,
    url: inviteUrl(args.cityId, args.meetId),
  });
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

export async function startMeetPlan(args: {
  cityId: CityId;
  meetId: string | null;
  name: string;
  onPlan: (p: PlanInfo) => void;
  onFlash: (msg: string) => void;
}): Promise<void> {
  if (!args.meetId) {
    args.onFlash("Pick a meet plaza first");
    return;
  }
  const host = cleanName(args.name) || "Host";
  const p = await createPlan(args.cityId, args.meetId, host);
  if (!p) {
    args.onFlash("Couldn’t start a plan — is the relay up?");
    return;
  }
  args.onPlan(p);
  useGame.setState({ planId: p.id });
  const url = inviteUrl(args.cityId, args.meetId, p.id);
  try {
    await navigator.clipboard.writeText(url);
    args.onFlash("Plan link copied · expires in 2 hours");
  } catch {
    args.onFlash(`Plan ready: ${url}`);
  }
}
