import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");
const port = Number.parseInt(process.env.STOREFRONT_PORT || "5175", 10);
const host = process.env.STOREFRONT_HOST || "0.0.0.0";
const healthUrl = `http://127.0.0.1:${port}/api/health`;
const maxRestarts = 8;

let child = null;
let shuttingDown = false;
let restartCount = 0;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function isHealthy() {
  try {
    const response = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(750);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function waitForHealthyServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !shuttingDown) {
    if (await isHealthy()) return true;
    await wait(500);
  }
  return false;
}

async function launch() {
  if (await isHealthy()) {
    console.log(`[storefront:dev] Healthy server already running on http://localhost:${port}; reusing it.`);
    return;
  }

  if (await isPortOpen()) {
    console.log(`[storefront:dev] Port ${port} is occupied; waiting for the existing storefront to become ready...`);
    if (await waitForHealthyServer(15000)) {
      console.log(`[storefront:dev] Existing storefront is ready on http://localhost:${port}.`);
      return;
    }
    throw new Error(`Port ${port} is occupied by a process that is not the storefront health endpoint.`);
  }

  console.log(`[storefront:dev] Starting Next.js on http://localhost:${port} (${host})...`);
  const startedAt = Date.now();
  child = spawn(process.execPath, [nextCli, "dev", "-H", host, "-p", String(port)], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  child.once("error", (error) => {
    console.error("[storefront:dev] Failed to launch Next.js:", error);
  });

  const exitPromise = new Promise((resolve) => child.once("close", resolve));
  const ready = await Promise.race([
    waitForHealthyServer(),
    exitPromise.then(() => false),
  ]);
  if (ready) console.log(`[storefront:dev] Ready: http://localhost:${port}`);

  const exitCode = await exitPromise;
  child = null;
  if (shuttingDown) return;

  if (Date.now() - startedAt > 60000) restartCount = 0;
  restartCount += 1;
  if (restartCount > maxRestarts) {
    throw new Error(`Storefront stopped repeatedly (${maxRestarts} restarts). Check the error above.`);
  }

  if (await isHealthy()) {
    console.log(`[storefront:dev] Another healthy storefront owns port ${port}; no duplicate server started.`);
    return;
  }

  const delay = Math.min(1000 * restartCount, 5000);
  console.warn(`[storefront:dev] Next.js exited with code ${exitCode ?? "unknown"}; restarting in ${delay}ms...`);
  await wait(delay);
  await launch();
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[storefront:dev] ${signal} received; stopping storefront.`);
  if (child && !child.killed) child.kill(signal);
  setTimeout(() => process.exit(0), 2500).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

launch().catch((error) => {
  console.error(`[storefront:dev] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
