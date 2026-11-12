const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const browser = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'exports', 'premium-theme-verification');
const tenantId = 'adf68b64-6588-49ec-b24a-938354207778';
const url = `http://127.0.0.1:5175/?tenantId=${tenantId}`;
const categoryUrl = `http://127.0.0.1:5175/category/audio-video?tenantId=${tenantId}`;
const searchUrl = `http://127.0.0.1:5175/search?q=tv&tenantId=${tenantId}`;
const productUrl = `http://127.0.0.1:5175/product/circuitlane-4k-smart-display?tenantId=${tenantId}`;
const footwearTenantId = 'e53c2bd6-f3f6-494f-8a38-d0943857b181';
const footwearCategoryUrl = `http://127.0.0.1:5175/category?tenantId=${footwearTenantId}`;
const footwearSearchUrl = `http://127.0.0.1:5175/search?q=boots&tenantId=${footwearTenantId}`;
const footwearProductUrl = `http://127.0.0.1:5175/product/stridefoundry-leather-oxford-shoes?tenantId=${footwearTenantId}`;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForFile(file, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(file)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${file}`);
}

async function readActivePort(file, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const value = fs.readFileSync(file, 'utf8').trim();
      if (value) return value.split(/\r?\n/u)[0];
    } catch (error) {
      if (!['EBUSY', 'EACCES', 'ENOENT'].includes(error?.code)) throw error;
    }
    await wait(100);
  }
  throw new Error(`Timed out reading ${file}`);
}

async function capture(name, width, height, mobile, targetSelector, pageUrl = url) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `premium-theme-${name}-`));
  const activePortFile = path.join(profile, 'DevToolsActivePort');
  const file = path.join(output, `electronics-${name}.png`);
  const child = spawn(browser, [
    '--headless=new', '--disable-gpu', '--disable-extensions', '--hide-scrollbars',
    '--no-first-run', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  try {
    await waitForFile(activePortFile);
    const port = await readActivePort(activePortFile);
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    const page = pages.find(entry => entry.type === 'page');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    const pending = new Map();
    const browserErrors = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params?.exceptionDetails?.text || 'Runtime exception');
      if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params?.entry?.level)) {
        const entry = message.params.entry;
        browserErrors.push(`${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
      }
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
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile,
      screenWidth: width, screenHeight: height,
    });
    await send('Page.navigate', { url: pageUrl });
    await wait(4500);
    if (name === 'category-dropdown') {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".industrial-nav-menu")?.setAttribute("open","");window.scrollTo(0,0)' });
      await wait(350);
    }
    if (name === 'category-dropdown-close') {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".industrial-nav-menu")?.setAttribute("open","");document.body.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))' });
      await wait(200);
    }
    if (name === 'trade-menu') {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".industrial-commerce-menu")?.setAttribute("open","");window.scrollTo(0,0)' });
      await wait(300);
    }
    if (name === 'trade-menu-close') {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".industrial-commerce-menu")?.setAttribute("open","");document.body.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))' });
      await wait(200);
    }
    if (name === 'back-home') {
      await send('Runtime.evaluate', { expression: 'document.querySelector(".industrial-nav-card")?.click()' });
      await wait(1800);
      await send('Runtime.evaluate', { expression: 'history.back()' });
      await wait(2800);
    }
    await send('Runtime.evaluate', { expression: targetSelector
      ? `document.querySelector(${JSON.stringify(targetSelector)})?.scrollIntoView({block:'start'});window.scrollBy(0,-145)`
      : 'window.scrollTo(0, 0)' });
    await wait(targetSelector ? 1200 : 350);
    const metrics = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({innerWidth,innerHeight,scrollX,scrollY,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,brand:document.body.innerText.includes("CircuitLane"),premium:Boolean(document.querySelector("style[data-theme-runtime-css]")?.textContent.includes("premium-commerce-v1")),categoryMenuOpen:Boolean(document.querySelector(".industrial-nav-menu")?.hasAttribute("open")),commerceMenuOpen:Boolean(document.querySelector(".industrial-commerce-menu")?.hasAttribute("open")),commerceHits:[".industrial-commerce-account",".industrial-commerce-panel-links>a[href*=wishlist]",".industrial-commerce-panel-links>a[aria-label^=Cart]"].map((selector)=>{const node=document.querySelector(selector);if(!node)return{selector,missing:true};const rect=node.getBoundingClientRect();const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return{selector,href:node.getAttribute("href"),center:[Math.round(rect.left+rect.width/2),Math.round(rect.top+rect.height/2)],hit:hit?.tagName,hitClass:hit?.className,inside:hit===node||node.contains(hit)}}),sectionCount:document.querySelectorAll(".theme-section-root").length,visibleSectionCount:Array.from(document.querySelectorAll(".theme-section-root")).filter((node)=>getComputedStyle(node).opacity!=="0").length,mainFormCount:document.querySelectorAll("main form").length,visibleSearchFormCount:Array.from(document.querySelectorAll("form[role=search]")).filter((node)=>{const rect=node.getBoundingClientRect();const style=getComputedStyle(node);return rect.width>0&&rect.height>0&&style.display!=="none"&&style.visibility!=="hidden"}).length})',
      returnByValue: true,
    });
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    socket.close();
    return { name, file: path.relative(root, file).replace(/\\/g, '/'), metrics: JSON.parse(metrics.result.value), browserErrors };
  } finally {
    child.kill();
    await wait(500);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  if (process.argv.includes('--catalog-only')) {
    results.push(await capture('catalog-page-desktop', 1440, 1100, false, null, categoryUrl));
    results.push(await capture('catalog-page-mobile', 390, 844, true, null, categoryUrl));
    results.push(await capture('category-dropdown-close', 1440, 900, false));
    results.push(await capture('catalog-footwear-desktop', 1440, 1100, false, null, footwearCategoryUrl));
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes('--back-only')) {
    results.push(await capture('back-home', 1440, 1100, false));
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes('--header-only')) {
    results.push(await capture('header-desktop', 1440, 420, false));
    results.push(await capture('header-mobile', 390, 420, true));
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes('--search-only')) {
    results.push(await capture('search-electronics-desktop', 1440, 900, false, null, searchUrl));
    results.push(await capture('search-footwear-desktop', 1440, 900, false, null, footwearSearchUrl));
    results.push(await capture('search-electronics-mobile', 390, 844, true, null, searchUrl));
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes('--product-only')) {
    results.push(await capture('product-electronics-desktop', 1440, 1100, false, null, productUrl));
    results.push(await capture('product-electronics-mobile', 390, 844, true, null, productUrl));
    results.push(await capture('product-footwear-desktop', 1440, 1100, false, null, footwearProductUrl));
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes('--trade-menu-only')) {
    results.push(await capture('trade-menu', 1440, 620, false));
    results.push(await capture('trade-menu-close', 1440, 420, false));
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes('--cards-only')) {
    results.push(await capture('products-desktop', 1440, 1100, false, '[data-section-type="product-grid"]'));
    results.push(await capture('catalog-page-desktop', 1440, 1100, false, null, categoryUrl));
    results.push(await capture('catalog-cards-mobile', 390, 844, true, '.category-product-grid .product-card-body', categoryUrl));
    results.push(await capture('catalog-footwear-desktop', 1440, 1100, false, '.category-product-grid .product-card-body', footwearCategoryUrl));
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes('--typography-only')) {
    results.push(await capture('typography-home-desktop', 1440, 1100, false));
    results.push(await capture('typography-home-mobile', 390, 844, true));
    results.push(await capture('typography-categories', 1440, 900, false, '[data-section-type="category-grid"]'));
    results.push(await capture('typography-faq', 1440, 900, false, '[data-section-type="faq-section"]'));
    console.log(JSON.stringify(results));
    return;
  }
  results.push(await capture('desktop', 1440, 1100, false));
  results.push(await capture('category-dropdown', 1440, 900, false));
  results.push(await capture('catalog-page-desktop', 1440, 1100, false, null, categoryUrl));
  results.push(await capture('catalog-page-mobile', 390, 844, true, null, categoryUrl));
  results.push(await capture('mobile', 390, 844, true));
  results.push(await capture('categories-desktop', 1440, 1000, false, '[data-section-type="category-grid"]'));
  results.push(await capture('products-desktop', 1440, 1000, false, '[data-section-type="product-grid"]'));
  results.push(await capture('faq-desktop', 1440, 1000, false, '[data-section-type="faq-section"]'));
  results.push(await capture('footer-desktop', 1440, 900, false, 'footer.storefront-footer'));
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
