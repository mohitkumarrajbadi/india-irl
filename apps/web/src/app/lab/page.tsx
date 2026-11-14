import type { Metadata } from "next";
import LabClient from "./LabClient";

export const metadata: Metadata = { title: "India IRL · Model lab" };

/** Dev-only turntable for every procedural model. Not linked from the game. */
export default function LabPage() {
  return <LabClient />;
}
