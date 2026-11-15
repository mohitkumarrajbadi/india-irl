import {
  awardXp,
  completeMission,
  levelInfo,
  loadVibe,
  type MissionId,
} from "@/game/vibe";
import { toast, useGame } from "./store-core";

/** Complete a daily mission if fresh; toast + sync store. */
export function grantMission(id: MissionId): void {
  const award = completeMission(id);
  if (!award) return;
  useGame.setState({ vibe: award.state });
  const meta = levelInfo(award.state.xp);
  if (award.leveled) toast(`Level ${meta.level} · ${award.title}`);
  else if (award.lucky) toast(`Lucky chai · +${award.gained} vibe`);
  else toast(`+${award.gained} vibe`);
}

export function syncVibe(): void {
  useGame.setState({ vibe: loadVibe() });
}

/** Raw XP drip for jobs / bonuses (not daily missions). */
export function grantXp(amount: number, label: string): void {
  const award = awardXp(amount);
  useGame.setState({ vibe: award.state });
  const meta = levelInfo(award.state.xp);
  if (award.leveled) toast(`${label} · Level ${meta.level} · ${award.title}`);
  else if (award.lucky) toast(`${label} · lucky +${award.gained} vibe`);
  else toast(`${label} · +${award.gained} vibe`);
}
