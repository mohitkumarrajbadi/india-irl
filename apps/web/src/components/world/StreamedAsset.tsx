"use client";

/** One streamed world asset — splat via drei, GLB via useGLTF. */
import { Splat, useGLTF } from "@react-three/drei";
import { Suspense } from "react";
import { CHUNK_SIZE } from "@/game/sim/chunk-cell";
import { roadSurfaceY } from "@/game/sim/road-builder";
import type { StreamAsset } from "@/game/stream/catalog";
import { AssetErrorBoundary } from "./AssetErrorBoundary";

type Props = { asset: StreamAsset };

/** Splat/GLB origin — Y matches Rapier road trimesh (splat-to-physics alignment). */
function cellOrigin(cx: number, cz: number): [number, number, number] {
  const x = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
  const z = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
  return [x, roadSurfaceY(null, x, z), z];
}

export function StreamedAsset({ asset }: Props) {
  const pos = cellOrigin(asset.cx, asset.cz);
  return (
    <AssetErrorBoundary>
      <Suspense fallback={null}>
        {asset.type === "splat" ? <Splat src={asset.url} position={pos} /> : <GlbMount url={asset.url} pos={pos} />}
      </Suspense>
    </AssetErrorBoundary>
  );
}

function GlbMount({ url, pos }: { url: string; pos: [number, number, number] }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene.clone()} position={pos} />;
}
