"use client";

import { memo } from "react";
import { PlayerController } from "@/components/player/PlayerController";
import { RemotePlayers } from "@/components/player/RemotePlayers";
import { VoiceController } from "@/components/player/VoiceController";
import type { Look } from "@/avatar/appearance";
import type { CityData } from "@/world/types";
import { Atmosphere } from "./Atmosphere";
import { CityBuildings } from "./CityBuildings";
import { CityGround } from "./CityGround";
import { CityProps } from "./CityProps";
import { Lake } from "./Lake";
import { MeetMarkers } from "./MeetMarkers";
import { Metro } from "./Metro";
import { Pedestrians } from "./Pedestrians";
import { Traffic } from "./Traffic";

type SceneProps = { city: CityData; name: string; look: Look };

/** Everything inside the Canvas. Memoised: nothing here re-renders from HUD state. */
export const Scene = memo(function Scene({ city, name, look }: SceneProps) {
  return (
    <>
      <Atmosphere config={city.config} />
      <CityGround city={city} />
      <CityBuildings city={city} />
      <CityProps city={city} />
      <MeetMarkers city={city} />
      <Metro city={city} />
      <Lake city={city} />
      <Traffic city={city} />
      <Pedestrians city={city} />
      <RemotePlayers config={city.config} />
      <VoiceController />
      <PlayerController city={city} name={name} look={look} />
    </>
  );
});
