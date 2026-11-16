/** Menu boot: profile, deep links, stats poll, plan poll, flash TTL. */
import { useEffect, useState } from "react";
import { applyEndowment, loadOnboard } from "@/game/onboarding";
import { loadProfile, setRememberProfile, useGame } from "@/game/store";
import { loadLastPlanId, saveLastPlanId } from "@/net/plans-persist";
import { fetchPlan, fetchStats, type PlanInfo, type StatsMap } from "@/net/stats";
import { loadVibe, touchStreak, type VibeState } from "@/game/vibe";
import { parseDeepLink } from "@/world/meets";
import type { CityId } from "@/world/types";

export function useMenuBootstrap() {
  const [stats, setStats] = useState<StatsMap>({});
  const [vibe, setVibe] = useState<VibeState>(loadVibe);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [flash, setFlash] = useState("");
  const [localTitle, setLocalTitleUi] = useState("");

  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      setRememberProfile(true);
      useGame.setState({ name: saved.name, look: saved.look, cityId: saved.city });
    }
    try {
      const deep = parseDeepLink(window.location.search);
      const patch: {
        cityId?: CityId;
        meetId?: string | null;
        joinId?: string | null;
        planId?: string | null;
      } = {};
      if (deep.city) patch.cityId = deep.city;
      if (deep.meet) patch.meetId = deep.meet;
      if (deep.join) patch.joinId = deep.join;
      if (deep.plan) patch.planId = deep.plan;
      else {
        const last = loadLastPlanId();
        if (last) patch.planId = last;
      }
      if (Object.keys(patch).length) useGame.setState(patch);
      const planId = patch.planId ?? null;
      if (planId) {
        void fetchPlan(planId).then((p) => {
          if (!p) {
            saveLastPlanId(null);
            return;
          }
          setPlan(p);
          saveLastPlanId(p.expired ? null : p.id);
          if (!p.expired && (deep.city || deep.plan)) {
            const cityId = p.city === "ommo" ? "novapura" : p.city;
            useGame.setState({ cityId, meetId: p.meet, planId: p.id });
          } else if (!p.expired) {
            useGame.setState({ planId: p.id });
          }
        });
      }
    } catch {
      /* ignore */
    }
    const award = touchStreak();
    const endowed = applyEndowment(award.state);
    setVibe(endowed?.vibe ?? award.state);
    useGame.setState({ vibe: endowed?.vibe ?? award.state });
    setLocalTitleUi(loadOnboard().localTitle);
    if (award.streakUp && award.state.streak > 1) setFlash(`${award.state.streak}-day streak · keep it alive`);
    else if (award.gained > 0) setFlash(`Welcome back`);
  }, []);

  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const tick = () =>
      fetchStats(ctl.signal).then((j) => {
        if (alive) setStats(j);
      });
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      ctl.abort();
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const planId = useGame.getState().planId;
    if (!planId) return;
    const id = setInterval(() => {
      void fetchPlan(planId).then((p) => p && setPlan(p));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 3800);
    return () => clearTimeout(t);
  }, [flash]);

  return { stats, vibe, setVibe, plan, setPlan, flash, setFlash, localTitle };
}
