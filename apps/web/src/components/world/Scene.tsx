"use client";

import { memo } from "react";
import { PlayerController } from "@/components/player/PlayerController";
import { RemotePlayers } from "@/components/player/RemotePlayers";
import { VoiceController } from "@/components/player/VoiceController";
import type { Look } from "@/avatar/appearance";
import type { CityData } from "@/world/types";
import { Animals } from "./Animals";
import { Atmosphere } from "./Atmosphere";
import { CityBuildings } from "./CityBuildings";
import { CityGround } from "./CityGround";
import { CityProps } from "./CityProps";
import { FlyoverMesh } from "./Flyover";
import { Lake } from "./Lake";
import { MeetMarkers } from "./MeetMarkers";
import { Metro } from "./Metro";
import { Pedestrians } from "./Pedestrians";
import { Police } from "./Police";
import { Rain } from "./Rain";
import { ShadowSimGhost } from "./ShadowSimGhost";
import { SignalLights } from "./SignalLights";
import { StreamedContent } from "./StreamedContent";
import { TerrainMesh } from "./TerrainMesh";
import { TrailRoads } from "./TrailRoads";
import { Traffic } from "./Traffic";

type SceneProps = { city: CityData; name: string; look: Look };

/** Everything inside the Canvas. Memoised: nothing here re-renders from HUD state. */
export const Scene = memo(function Scene({ city, name, look }: SceneProps) {
  return (
    <>
      <Atmosphere config={city.config} />
      <Rain />
      <TerrainMesh city={city} />
      <TrailRoads city={city} />
      <FlyoverMesh city={city} />
      <CityGround city={city} />
      <CityBuildings city={city} />
      <CityProps city={city} />
      <SignalLights city={city} />
      <MeetMarkers city={city} />
      <Metro city={city} />
      <Lake city={city} />
      <Traffic city={city} />
      <Pedestrians city={city} />
      <Animals city={city} />
      <Police city={city} />
      <StreamedContent />
      <RemotePlayers config={city.config} />
      <VoiceController />
      <PlayerController city={city} name={name} look={look} />
      {/* Phase A: Rapier ghost auto — arcade remains authority. See docs/HLD.md */}
      <ShadowSimGhost />
    </>
  );
});
