const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sharp = require('../backend/node_modules/sharp');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'exports', 'reference-theme-audit');
const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);

if (!browser) throw new Error('Chrome or Edge is required');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFile(file, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(file)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${file}`);
}

async function captureWithCdp(item) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `reference-cdp-${process.pid}-`));
  const activePortFile = path.join(profile, 'DevToolsActivePort');
  const child = spawn(browser, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run',
    '--ignore-certificate-errors', '--disable-popup-blocking', '--hide-scrollbars',
    '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, '--window-size=1440,1100', 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  try {
    await waitForFile(activePortFile, 10000);
    await wait(500);
    const [port] = fs.readFileSync(activePortFile, 'utf8').trim().split(/\r?\n/u);
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    const page = pages.find((entry) => entry.type === 'page');
    if (!page?.webSocketDebuggerUrl) throw new Error('No Chrome page target');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !pending.has(message.id)) return;
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result ?? {});
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: item.url });
    await wait(14000);
    const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(item.file, Buffer.from(result.data, 'base64'));
    socket.close();
    const image = sharp(item.file);
    const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
    return { ...item, status: stats.entropy < 0.25 ? 'blocked' : 'captured', width: metadata.width ?? null, height: metadata.height ?? null, entropy: stats.entropy, retry: 'cdp-fixed-wait' };
  } catch (error) {
    return { ...item, status: 'failed', retry: 'cdp-fixed-wait', error: error.message };
  } finally {
    child.kill();
    await wait(750);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome can briefly retain Windows profile locks after Browser.close.
      // The OS temp directory will clean the isolated profile later.
    }
  }
}

async function run(start, end) {
  const batchFile = path.join(output, `batch-${start}-${end}.json`);
  const entries = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index].status !== 'failed') continue;
    entries[index] = await captureWithCdp(entries[index]);
  }
  fs.writeFileSync(batchFile, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(JSON.stringify({ start, end, captured: entries.filter((item) => item.status === 'captured').length, failed: entries.filter((item) => item.status !== 'captured').length, results: entries }));
}

const [start, end] = process.argv.slice(2).map(Number);
run(start, end).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
