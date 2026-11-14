"use client";

import dynamic from "next/dynamic";

// Three.js must never run on the server.
const ModelLab = dynamic(() => import("@/components/lab/ModelLab"), {
  ssr: false,
  loading: () => <div className="boot">Model lab</div>,
});

export default function LabClient() {
  return <ModelLab />;
}
