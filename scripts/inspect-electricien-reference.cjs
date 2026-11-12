const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const browser = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'exports', 'reference-theme-audit', 'electricien-live');
const url = 'https://php.kodesolution.com/2025/electricien-php/?storefront=envato-elements';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForFile(file, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (fs.existsSync(file)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${file}`);
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'electricien-inspect-'));
  const activePortFile = path.join(profile, 'DevToolsActivePort');
  const child = spawn(browser, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--hide-scrollbars',
    '--no-first-run', '--ignore-certificate-errors', '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  try {
    await waitForFile(activePortFile);
    const [port] = fs.readFileSync(activePortFile, 'utf8').trim().split(/\r?\n/u);
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    const page = pages.find(entry => entry.type === 'page');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !pending.has(message.id)) return;
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message));
      else handlers.resolve(message.result ?? {});
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const requestId = ++id;
      pending.set(requestId, { resolve, reject });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url });
    await wait(12000);
    await send('Runtime.evaluate', { expression: `
      document.querySelectorAll('.preloader').forEach(node => node.remove());
      document.documentElement.style.scrollBehavior='auto';
      [...document.querySelectorAll('section,footer')].forEach((node, index) => setTimeout(() => node.scrollIntoView(), index * 80));
    ` });
    await wait(1800);
    await send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)' });
    await wait(400);
    const auditResult = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `JSON.stringify({
        title: document.title,
        viewport: {width: innerWidth, height: innerHeight},
        page: {width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight},
        nav: [...document.querySelectorAll('.main-header .navigation > li > a')].slice(0,12).map(a => a.textContent.trim()),
        sections: [...document.querySelectorAll('section')].map(section => {
          const box = section.getBoundingClientRect();
          const style = getComputedStyle(section);
          return {className: section.className, top: Math.round(box.top + scrollY), height: Math.round(box.height), backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage};
        }),
        footer: (() => { const node=document.querySelector('footer'); if(!node)return null; const box=node.getBoundingClientRect(); return {className:node.className,top:Math.round(box.top+scrollY),height:Math.round(box.height)}; })(),
        motion: [...document.querySelectorAll('.wow,[class*="animate-"],.owl-carousel,.bounce-y')].slice(0,80).map(node => { const style=getComputedStyle(node); return {tag:node.tagName,className:node.className,animationName:style.animationName,animationDuration:style.animationDuration,transition:style.transition}; }),
        counts: {wow:document.querySelectorAll('.wow').length, owl:document.querySelectorAll('.owl-carousel').length, dropdowns:document.querySelectorAll('.navigation .dropdown').length, accordions:document.querySelectorAll('.accordion-box').length, counters:document.querySelectorAll('.count-box').length}
      })`,
    });
    const audit = JSON.parse(auditResult.result.value);
    fs.writeFileSync(path.join(output, 'audit.json'), JSON.stringify(audit, null, 2) + '\n');
    const full = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
    fs.writeFileSync(path.join(output, 'full-page.png'), Buffer.from(full.data, 'base64'));
    const top = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, 'top.png'), Buffer.from(top.data, 'base64'));
    await send('Runtime.evaluate', { expression: 'document.querySelector("footer")?.scrollIntoView({block:"end"})' });
    await wait(300);
    const footer = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, 'footer.png'), Buffer.from(footer.data, 'base64'));
    socket.close();
    console.log(JSON.stringify({ output: path.relative(root, output).replace(/\\/g, '/'), ...audit }));
  } finally {
    child.kill();
    await wait(500);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
