const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const browser = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const root = path.resolve(__dirname, "..");
const output = path.join(root, "exports", "textile-theme-verification");
const tenantId = "42a85b23-010f-4d8c-bd81-a861938424ec";
const url = `http://127.0.0.1:5175/?tenantId=${tenantId}&tenant=weavedistrict-b2b&wPreview=0`;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForFile(file, timeout = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (fs.existsSync(file)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${file}`);
}

async function capture(name, width, height, mobile, selector, targetUrl = url, testWishlist = false, testCategoryMenu = false, testCart = false, forceLightHeader = false) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `textile-theme-${name}-`));
  const activePortFile = path.join(profile, "DevToolsActivePort");
  const file = path.join(output, `${name}.png`);
  const child = spawn(browser, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--hide-scrollbars",
    "--no-first-run",
    "--remote-debugging-port=0",
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { windowsHide: true, stdio: "ignore" });

  try {
    await waitForFile(activePortFile);
    const port = fs.readFileSync(activePortFile, "utf8").trim().split(/\r?\n/u)[0];
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    const page = pages.find((entry) => entry.type === "page");
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });

    let requestId = 0;
    const pending = new Map();
    const browserErrors = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.method === "Runtime.exceptionThrown") {
        browserErrors.push(message.params?.exceptionDetails?.text || "Runtime exception");
      }
      if (message.method === "Log.entryAdded" && message.params?.entry?.level === "error") {
        browserErrors.push(message.params.entry.text);
      }
      if (!message.id || !pending.has(message.id)) return;
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message));
      else handlers.resolve(message.result ?? {});
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++requestId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    if (testWishlist || testCategoryMenu || testCart) {
      await send("Network.enable");
      await send("Network.setCookie", {
        name: "customer_token",
        value: "local-preview-verification",
        url: targetUrl,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      });
    }
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });
    await send("Page.navigate", { url: targetUrl });
    await wait(4800);
    if (forceLightHeader) {
      await send("Runtime.evaluate", {
        expression: `document.querySelector('header.textile-atelier-header')?.style.setProperty('background','#fcf8f0','important')`,
      });
      await wait(350);
    }
    if (testCategoryMenu) {
      await send("Runtime.evaluate", {
        expression: `document.querySelector('.storefront-category-menu>a')?.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`,
      });
      await wait(350);
      await send("Runtime.evaluate", {
        expression: `(() => { const panel = document.querySelector('.storefront-category-panel'); window.__categoryMenuWasOpen = panel ? getComputedStyle(panel).visibility === 'visible' : false; document.querySelector('.storefront-category-panel-grid>a')?.click(); })()`,
      });
      await wait(1000);
    }
    if (testWishlist) {
      await send("Runtime.evaluate", {
        expression: `document.querySelector('.product-card')?.scrollIntoView({block:"center"})`,
      });
      await wait(800);
      await send("Runtime.evaluate", {
        expression: `document.querySelector('.product-card button[aria-label*="wishlist" i]')?.click()`,
      });
      await wait(1200);
      await send("Runtime.evaluate", { expression: `window.scrollTo({top:0,behavior:"instant"})` });
      await wait(600);
      if (mobile && new URL(targetUrl).pathname === "/") {
        await send("Runtime.evaluate", { expression: `document.querySelector('header details summary')?.click()` });
        await wait(350);
      }
    }
    if (testCart) {
      await send("Runtime.evaluate", {
        expression: `(() => { const params = new URLSearchParams(location.search); const tenant = (params.get('tenantId') || params.get('tenant') || location.host).toLowerCase(); localStorage.setItem('storefront_theme_preview_cart_v2:' + tenant, JSON.stringify([{productId:'cart-verification-product',productName:'WeaveDistrict Polyester Yarn Cone',productSlug:'weavedistrict-polyester-yarn-cone',variantId:'sample-roll',sku:'WEB-03-4',quantity:12,price:650,currency:'INR',image:'http://localhost:3000/storage/themes/web/textile-web-theme/assets/images/product-04.jpg'}])); window.dispatchEvent(new CustomEvent('storefront:preview-commerce-changed')); })()`,
      });
      await wait(1000);
      if (mobile && new URL(targetUrl).pathname === "/") {
        await send("Runtime.evaluate", { expression: `document.querySelector('header details summary')?.click()` });
        await wait(350);
      }
    }
    if (selector) {
      await send("Runtime.evaluate", {
        expression: `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:"start"});window.scrollBy(0,-110)`,
      });
      await wait(1000);
    }

    const result = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        sectionCount: document.querySelectorAll(".theme-section-root").length,
        visibleSectionCount: Array.from(document.querySelectorAll(".theme-section-root")).filter((node) => getComputedStyle(node).opacity !== "0").length,
        motionReady: document.body.classList.contains("storefront-motion-ready"),
        searchVisible: Array.from(document.querySelectorAll("form[role=search]")).some((node) => { const rect=node.getBoundingClientRect(); return rect.width>0 && rect.height>0; }),
        heroTitle: document.querySelector(".theme-hero-title")?.textContent?.trim(),
        productColumns: (() => { const node = document.querySelector('[data-section-type="product-grid"] section>div:last-child, .category-product-grid'); return node ? getComputedStyle(node).gridTemplateColumns : null; })(),
        firstProductCard: (() => { const rect = document.querySelector('.product-card')?.getBoundingClientRect(); return rect ? { width: rect.width, height: rect.height } : null; })(),
        wishlistNavLabel: document.querySelector('.textile-nav a[aria-label^="Wishlist"]')?.getAttribute('aria-label') ?? null,
        wishlistLabels: Array.from(document.querySelectorAll('header a[aria-label^="Wishlist"]')).map((node) => node.getAttribute('aria-label')),
        cartNavLabel: document.querySelector('.textile-nav a[aria-label^="Cart"]')?.getAttribute('aria-label') ?? null,
        cartLabels: Array.from(document.querySelectorAll('header a[aria-label^="Cart"], header button[aria-label^="Cart"]')).map((node) => node.getAttribute('aria-label')),
        footerHasOffers: Array.from(document.querySelectorAll('footer a')).some((node) => node.textContent?.trim().toLowerCase() === 'offers'),
        footerHeadings: Array.from(document.querySelectorAll('footer nav.storefront-footer-directory h2')).map((node) => node.textContent?.trim()),
        footerLinks: Array.from(document.querySelectorAll('footer nav.storefront-footer-directory a')).map((node) => node.textContent?.trim()),
        informationPageTitle: document.querySelector('.storefront-information-page h1')?.textContent?.trim() ?? null,
        informationCardCount: document.querySelectorAll('.storefront-information-page article').length,
        headerVariant: document.querySelector('header.storefront-header')?.getAttribute('data-header-variant') ?? null,
        themeDesign: document.body.getAttribute('data-theme-layout'),
        runtimeThemeCssLoaded: (document.querySelector('style[data-theme-runtime-css]')?.textContent?.length ?? 0) > 1000,
        visibleDesktopSearchCount: Array.from(document.querySelectorAll('.storefront-header-search form')).filter((node) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; }).length,
        aureliaHeroVariant: document.querySelector('[data-section-variant="hero-jowenly-campaign"]')?.getAttribute('data-section-variant') ?? null,
        aureliaFooterColumnCount: document.querySelectorAll('footer .storefront-footer-directory > div').length,
        aureliaAssuranceVisible: (() => { const node = document.querySelector('footer .storefront-footer-signals'); if (!node) return false; const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; })(),
        cartPageTitle: document.querySelector('.storefront-cart-page h1')?.textContent?.trim() ?? null,
        cartPageColumns: (() => { const node = document.querySelector('.storefront-cart-page .cart-layout'); return node ? getComputedStyle(node).gridTemplateColumns : null; })(),
        cartSummaryVisible: (() => { const node = document.querySelector('.storefront-cart-page .cart-order-summary'); if (!node) return false; const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; })(),
        headerBackground: (() => { const node = document.querySelector('header.textile-atelier-header'); return node ? getComputedStyle(node).backgroundColor : null; })(),
        headerScrolled: document.querySelector('header.textile-atelier-header')?.classList.contains('is-scrolled') ?? false,
        brandPlateBackground: (() => { const node = document.querySelector('.textile-brand-lockup'); return node ? getComputedStyle(node).backgroundColor : null; })(),
        brandTitleColor: (() => { const node = document.querySelector('.textile-brand-lockup>span:last-child>span:first-child'); return node ? getComputedStyle(node).color : null; })(),
        brandTitleVisible: (() => { const node = document.querySelector('.textile-brand-lockup>span:last-child>span:first-child'); if (!node) return false; const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== 'hidden'; })(),
        categoryMenuWasOpen: Boolean(window.__categoryMenuWasOpen),
        categoryMenuOpenAfterClick: (() => { const panel = document.querySelector('.storefront-category-panel'); return panel ? getComputedStyle(panel).visibility === 'visible' : false; })(),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth
      })`,
      returnByValue: true,
    });
    const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    socket.close();
    return { name, file: path.relative(root, file).replace(/\\/gu, "/"), metrics: JSON.parse(result.result.value), browserErrors };
  } finally {
    child.kill();
    await wait(350);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  if (process.argv.includes("--category-only")) {
    const categoryUrl = `http://127.0.0.1:5175/category?sort=price_asc&tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const results = [
      await capture("desktop-category-products", 1440, 1050, false, ".category-results-toolbar", categoryUrl),
      await capture("mobile-category-products", 390, 844, true, ".category-results-toolbar", categoryUrl),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--hero-only")) {
    const results = [
      await capture("desktop-hero", 1440, 850, false, null),
      await capture("desktop-hero-wide", 1920, 900, false, null),
      await capture("mobile-hero", 390, 844, true, null),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--wishlist-only")) {
    const wishlistUrl = `http://weavedistrict-b2b.localhost:5175/?tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const results = [
      await capture("desktop-wishlist-count", 1920, 900, false, null, wishlistUrl, true),
      await capture("mobile-wishlist-count", 390, 844, true, null, wishlistUrl, true),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--category-menu-only")) {
    const categoryMenuUrl = `http://weavedistrict-b2b.localhost:5175/category/fabrics?tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const results = [
      await capture("desktop-category-menu-closed", 1920, 900, false, null, categoryMenuUrl, false, true),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--cart-only")) {
    const cartUrl = `http://weavedistrict-b2b.localhost:5175/?tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const results = [
      await capture("desktop-cart-count", 1920, 900, false, null, cartUrl, false, false, true),
      await capture("mobile-cart-count", 390, 844, true, null, cartUrl, false, false, true),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--shared-cart-count-only")) {
    const textileUrl = `http://weavedistrict-b2b.localhost:5175/?tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const footwearUrl = "http://stridefoundry-b2b.localhost:5175/?tenantId=e93c2bd6-f3f6-494f-8a38-d0943857b181&tenant=stridefoundry-b2b&wbPreview=0&previewMode=1";
    const results = [
      await capture("desktop-shared-cart-textile", 1920, 700, false, null, textileUrl, false, false, true),
      await capture("desktop-shared-cart-footwear", 1920, 700, false, null, footwearUrl, false, false, true),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--cart-page-only")) {
    const cartPageUrl = `http://weavedistrict-b2b.localhost:5175/cart?tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const results = [
      await capture("desktop-cart-page", 1920, 1050, false, null, cartPageUrl, false, false, true),
      await capture("mobile-cart-page", 390, 1000, true, null, cartPageUrl, false, false, true),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--light-header-only")) {
    const headerUrl = `http://weavedistrict-b2b.localhost:5175/?tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const results = [
      await capture("desktop-light-header", 1920, 500, false, null, headerUrl, false, false, false, true),
      await capture("mobile-light-header", 390, 500, true, null, headerUrl, false, false, false, true),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--scroll-header-only")) {
    const headerUrl = `http://weavedistrict-b2b.localhost:5175/?tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const results = [
      await capture("desktop-header-top", 1920, 500, false, null, headerUrl),
      await capture("desktop-header-scrolled", 1920, 500, false, '[data-section-type="product-grid"]', headerUrl),
      await capture("mobile-header-scrolled", 390, 500, true, '[data-section-type="product-grid"]', headerUrl),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--site-directory-only")) {
    const textileBase = `http://weavedistrict-b2b.localhost:5175`;
    const textileQuery = `tenantId=${tenantId}&tenant=weavedistrict-b2b&wbPreview=0&previewMode=1`;
    const footwearHome = "http://stridefoundry-b2b.localhost:5175/?tenantId=e93c2bd6-f3f6-494f-8a38-d0943857b181&tenant=stridefoundry-b2b&wbPreview=0&previewMode=1";
    const results = [
      await capture("desktop-shared-footer-textile", 1920, 1000, false, "footer.storefront-footer", `${textileBase}/?${textileQuery}`),
      await capture("mobile-shared-footer-textile", 390, 1000, true, "footer.storefront-footer", `${textileBase}/?${textileQuery}`),
      await capture("desktop-shared-footer-footwear", 1920, 1000, false, "footer.storefront-footer", footwearHome),
      await capture("desktop-offers-page", 1440, 1000, false, null, `${textileBase}/offers?${textileQuery}`),
      await capture("mobile-returns-page", 390, 844, true, null, `${textileBase}/returns?${textileQuery}`),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  if (process.argv.includes("--jewelry-regression-only")) {
    const jewelryUrl = "http://ab-jewelry.localhost:5175/?tenantId=cce2df14-ec47-4158-9892-27bbf63e802f&tenant=ab-jewelry&wbPreview=0";
    const results = [
      await capture("desktop-jewelry-original-design", 1920, 1000, false, null, jewelryUrl),
      await capture("mobile-jewelry-original-design", 390, 844, true, null, jewelryUrl),
      await capture("desktop-jewelry-original-footer", 1920, 1000, false, "footer.storefront-footer", jewelryUrl),
    ];
    console.log(JSON.stringify(results));
    return;
  }
  const results = [
    await capture("desktop-hero", 1440, 1050, false, null),
    await capture("desktop-categories", 1440, 1050, false, '[data-section-type="category-grid"]'),
    await capture("desktop-story", 1440, 1050, false, '[data-section-type="image-with-text"]'),
    await capture("desktop-products", 1440, 1050, false, '[data-section-type="product-grid"]'),
    await capture("desktop-benefits", 1440, 1050, false, '[data-section-type="feature-list"]'),
    await capture("desktop-testimonial", 1440, 950, false, '[data-section-type="testimonial-carousel"]'),
    await capture("desktop-footer", 1440, 900, false, "footer.storefront-footer"),
    await capture("mobile-hero", 390, 844, true, null),
    await capture("mobile-products", 390, 844, true, '[data-section-type="product-grid"]'),
  ];
  fs.writeFileSync(path.join(output, "verification.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results));
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
