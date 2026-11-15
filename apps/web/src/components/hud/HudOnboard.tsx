"use client";

import { advanceStep, comebackCopy, setIntent, type Intent } from "@/game/onboarding";
import { useGame } from "@/game/store";

const INTENTS: { id: NonNullable<Intent>; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "dating", label: "Dating" },
  { id: "referrals", label: "Referrals" },
  { id: "vibing", label: "Just vibing" },
];

export function HudOnboard({
  comebackDistrict,
  cityLabel,
}: {
  comebackDistrict: string;
  cityLabel: string;
}) {
  const onboardUi = useGame((s) => s.onboardUi);

  const pickIntent = (id: NonNullable<Intent>) => {
    setIntent(id);
    useGame.setState({ onboardUi: "comeback" });
  };

  const dismissComeback = () => {
    advanceStep("done");
    useGame.setState({ onboardUi: null });
  };

  if (onboardUi === "intent") {
    return (
      <div className="onboard-card" role="dialog" aria-label="Who are you here for">
        <h2>Who are you here for?</h2>
        <p>Stored for later — nothing unlocks yet.</p>
        <div className="onboard-actions">
          {INTENTS.map((i) => (
            <button key={i.id} type="button" onClick={() => pickIntent(i.id)}>
              {i.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (onboardUi === "comeback") {
    return (
      <div className="onboard-card" role="dialog" aria-label="Come back later">
        <h2>You’re in</h2>
        <p>{comebackCopy(comebackDistrict || cityLabel)}</p>
        <div className="onboard-actions">
          <button type="button" onClick={dismissComeback}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return null;
}
