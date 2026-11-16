"use client";

import { AdaptiveDpr } from "@react-three/drei";
import { memo } from "react";
import { PlayerController } from "@/components/player/PlayerController";
import { RemotePlayers } from "@/components/player/RemotePlayers";
import { VoiceController } from "@/components/player/VoiceController";
import type { Look } from "@/avatar/appearance";
import type { CityData } from "@/world/types";
import { Animals } from "./Animals";
import { ApartmentDoors } from "./ApartmentDoors";
import { ApartmentInterior } from "./ApartmentInterior";
import { Atmosphere } from "./Atmosphere";
import { CityGround } from "./CityGround";
import { StreamedCityLayer } from "./StreamedCityLayer";
import { FlyoverMesh } from "./Flyover";
import { Lake } from "./Lake";
import { MeetMarkers } from "./MeetMarkers";
import { Metro } from "./Metro";
import { Mist } from "./Mist";
import { Pedestrians } from "./Pedestrians";
import { Police } from "./Police";
import { Rain } from "./Rain";
import { ShadowSimGhost } from "./ShadowSimGhost";
import { SignalLights } from "./SignalLights";
import { StreamedContent } from "./StreamedContent";
import { TerrainMesh } from "./TerrainMesh";
import { TrailRoads } from "./TrailRoads";
import { Traffic } from "./Traffic";
import { UnderpassMesh } from "./Underpass";
import { VillageSettlements } from "./VillageSettlements";

type SceneProps = { city: CityData; name: string; look: Look };

/** Everything inside the Canvas. Memoised: nothing here re-renders from HUD state. */
export const Scene = memo(function Scene({ city, name, look }: SceneProps) {
  return (
    <>
      <AdaptiveDpr />
      <Atmosphere config={city.config} />
      <Rain />
      <Mist />
      <TerrainMesh city={city} />
      <TrailRoads city={city} />
      <FlyoverMesh city={city} />
      <UnderpassMesh city={city} />
      <VillageSettlements city={city} />
      <CityGround city={city} />
      <StreamedCityLayer city={city} />
      <SignalLights city={city} />
      <MeetMarkers city={city} />
      <ApartmentDoors city={city} />
      <ApartmentInterior />
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
