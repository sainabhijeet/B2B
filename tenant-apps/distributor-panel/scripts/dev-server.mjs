import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.DISTRIBUTOR_PORT || "5174", 10);
const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const localUrl = `http://localhost:${port}`;

async function isDistributorPanel() {
  try {
    const response = await fetch(`${localUrl}/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes("<title>Distributor panel</title>");
  } catch {
    return false;
  }
}

function canConnect(host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (connected) => {
      socket.destroy();
      resolve(connected);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function isPortOccupied() {
  const results = await Promise.all([canConnect("127.0.0.1"), canConnect("::1")]);
  return results.some(Boolean);
}

async function main() {
  if (await isDistributorPanel()) {
    console.log(`[distributor:dev] Healthy server already running at ${localUrl}; reusing it.`);
    return;
  }

  if (await isPortOccupied()) {
    throw new Error(
      `Port ${port} is occupied by another application. Stop that process before starting Distributor Panel.`,
    );
  }

  console.log(`[distributor:dev] Starting Vite at ${localUrl}...`);
  const child = spawn(process.execPath, [viteCli], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  let stopping = false;
  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    if (!child.killed) child.kill(signal);
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (!stopping && exitCode !== 0) process.exitCode = exitCode ?? 1;
}

main().catch((error) => {
  console.error(`[distributor:dev] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
