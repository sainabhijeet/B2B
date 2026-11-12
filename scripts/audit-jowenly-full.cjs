const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(fs.existsSync);
if (!browser) throw new Error('Chrome or Edge is required.');

const url = process.argv[2] || 'https://wpolive.com/html/jowenly/index.html';
const outputDir = path.resolve(process.argv[3] || 'exports/jowenly-full-audit');
const profileDir = path.join(outputDir, '.chrome-profile');
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForFile(file, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(file)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${file}`);
}

async function connectCdp(port) {
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  const page = pages.find((entry) => entry.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('No Chrome page target.');
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
    const callback = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(message.error.message));
    else callback.resolve(message.result ?? {});
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { socket, send };
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed.');
  return result.result?.value;
}

async function capture(send, file, width, height, fullPage) {
  let params = { format: 'png', fromSurface: true, captureBeyondViewport: Boolean(fullPage) };
  if (fullPage) {
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize;
    params.clip = {
      x: 0,
      y: 0,
      width: Math.ceil(size.width || width),
      height: Math.min(Math.ceil(size.height || height), 24000),
      scale: 1,
    };
  }
  const shot = await send('Page.captureScreenshot', params);
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
}

const auditExpression = `(() => {
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 1 && rect.height > 1;
  };
  const unique = (items) => [...new Set(items.filter(Boolean))];
  const elementSummary = (element) => {
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: clean(element.className).slice(0, 240) || null,
      heading: clean(element.querySelector('h1,h2,h3,h4')?.textContent).slice(0, 180) || null,
      text: clean(element.textContent).slice(0, 260),
      top: Math.round(rect.top + scrollY),
      height: Math.round(rect.height),
    };
  };
  const sections = [...document.querySelectorAll('section')].filter(visible).map(elementSummary);
  const navLinks = [...document.querySelectorAll('header a, nav a, .menu a')].filter(visible).map((link) => ({
    text: clean(link.textContent).slice(0, 100),
    href: link.href,
    className: clean(link.className).slice(0, 180),
  })).filter((link) => link.text || link.href);
  const animations = [...document.querySelectorAll('body *')].filter(visible).flatMap((element) => {
    const style = getComputedStyle(element);
    const dataAnimation = element.getAttribute('data-aos') || element.getAttribute('data-wow-delay') || element.getAttribute('data-animation');
    const animated = style.animationName !== 'none' || style.transitionDuration !== '0s' || dataAnimation || /wow|animate|fade|slide|zoom|reveal/i.test(element.className || '');
    if (!animated) return [];
    return [{
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: clean(element.className).slice(0, 180) || null,
      animationName: style.animationName,
      animationDuration: style.animationDuration,
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
      dataAnimation: dataAnimation || null,
    }];
  }).slice(0, 250);
  const images = [...document.images].filter(visible).map((image) => ({
    src: image.currentSrc || image.src,
    alt: image.alt || '',
    width: image.naturalWidth,
    height: image.naturalHeight,
    loading: image.loading || null,
  }));
  const carousels = [...document.querySelectorAll('.swiper,.swiper-container,.owl-carousel,.slick-slider,[class*="carousel"],[class*="slider"]')].filter(visible).map(elementSummary);
  const forms = [...document.forms].filter(visible).map((form) => ({
    action: form.action,
    method: form.method,
    fields: [...form.elements].map((field) => ({ tag: field.tagName.toLowerCase(), type: field.type || null, name: field.name || null, placeholder: field.placeholder || null })),
  }));
  const buttons = [...document.querySelectorAll('button,[role="button"],.btn')].filter(visible).map((button) => ({ text: clean(button.textContent).slice(0, 100), className: clean(button.className).slice(0, 180) }));
  const backgrounds = unique([...document.querySelectorAll('body *')].filter(visible).map((element) => getComputedStyle(element).backgroundImage).filter((value) => value && value !== 'none')).slice(0, 120);
  return {
    url: location.href,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight },
    page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    bodyClass: clean(document.body.className),
    headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).map((heading) => ({ level: heading.tagName.toLowerCase(), text: clean(heading.textContent).slice(0, 220) })),
    sections,
    navLinks,
    buttons,
    carousels,
    animations,
    images,
    backgrounds,
    forms,
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    stylesheets: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
  };
})()`;

async function auditViewport(send, name, width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height });
  await send('Page.navigate', { url });
  await wait(15000);
  await evaluate(send, `(() => { document.querySelectorAll('.preloader,.loader,.page-loader,#preloader').forEach((node) => node.remove()); return true; })()`);
  const dimensions = await evaluate(send, `({ height: document.documentElement.scrollHeight, viewport: innerHeight })`);
  for (let y = 0; y < dimensions.height; y += Math.max(500, Math.floor(height * 0.72))) {
    await evaluate(send, `scrollTo({top:${y},behavior:'instant'})`);
    await wait(220);
  }
  await evaluate(send, `scrollTo({top:0,behavior:'instant'})`);
  await wait(800);
  const report = await evaluate(send, auditExpression);
  await capture(send, path.join(outputDir, `${name}-full.png`), width, height, true);
  await capture(send, path.join(outputDir, `${name}-top.png`), width, height, false);
  fs.writeFileSync(path.join(outputDir, `${name}-audit.json`), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

(async () => {
  const activePortFile = path.join(profileDir, 'DevToolsActivePort');
  const child = spawn(browser, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--hide-scrollbars', '--no-first-run',
    '--ignore-certificate-errors', '--disable-popup-blocking', '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profileDir}`, '--window-size=1440,1000', 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    await waitForFile(activePortFile);
    const [port] = fs.readFileSync(activePortFile, 'utf8').trim().split(/\r?\n/u);
    const cdp = await connectCdp(port);
    socket = cdp.socket;
    const send = cdp.send;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    const desktop = await auditViewport(send, 'desktop', 1440, 1000, false);
    const mobile = await auditViewport(send, 'mobile', 390, 844, true);
    fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify({ url, desktop, mobile }, null, 2)}\n`);
    console.log(JSON.stringify({ valid: true, url, outputDir, desktopHeight: desktop.page.height, mobileHeight: mobile.page.height, desktopSections: desktop.sections.length, mobileSections: mobile.sections.length, animations: desktop.animations.length, carousels: desktop.carousels.length }));
    await send('Browser.close').catch(() => undefined);
  } finally {
    socket?.close();
    child.kill();
    await wait(1200);
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
