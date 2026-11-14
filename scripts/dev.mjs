// Starts the multiplayer relay and the Next dev server together.
import { spawn } from "node:child_process";

const procs = [
  spawn("node", ["server/relay.mjs"], { stdio: "inherit" }),
  spawn("npm", ["run", "dev", "-w", "@india-irl/web"], { stdio: "inherit" }),
];

const stop = () => procs.forEach((p) => p.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const p of procs) {
  p.on("exit", (code) => {
    stop();
    process.exit(code ?? 0);
  });
}
