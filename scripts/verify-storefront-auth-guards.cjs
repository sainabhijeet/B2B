const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const tenantId = "adf68b64-6588-49ec-b24a-938354207778";
const productUrl = `http://127.0.0.1:5175/product/circuitlane-4k-smart-display?tenantId=${tenantId}`;
const homeUrl = `http://127.0.0.1:5175/?tenantId=${tenantId}`;
const footwearTenantId = "e53c2bd6-f3f6-494f-8a38-d0943857b181";
const footwearProductUrl = `http://127.0.0.1:5175/product/stridefoundry-leather-oxford-shoes?tenantId=${footwearTenantId}`;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(test, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await test();
    if (value) return value;
    await wait(100);
  }
  throw new Error("Timed out waiting for browser state");
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "storefront-auth-guard-"));
  const activePortFile = path.join(profile, "DevToolsActivePort");
  const child = spawn(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    "--remote-debugging-port=0",
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profile}`,
    "about:blank",
  ], { windowsHide: true, stdio: "ignore" });

  try {
    await waitFor(() => fs.existsSync(activePortFile));
    const port = fs.readFileSync(activePortFile, "utf8").trim().split(/\r?\n/u)[0];
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
    const socket = new WebSocket(pages.find((entry) => entry.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });

    let commandId = 0;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !pending.has(message.id)) return;
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(message.error.message));
      else handlers.resolve(message.result ?? {});
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++commandId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const response = await send("Runtime.evaluate", { expression, returnByValue: true });
      return response.result?.value;
    };

    await send("Page.enable");
    await send("Runtime.enable");

    async function verify(name, url, clickExpression) {
      await send("Page.navigate", { url });
      await waitFor(async () => await evaluate("document.readyState === 'complete'"));
      await waitFor(async () => await evaluate(clickExpression));
      await waitFor(async () => await evaluate("location.pathname === '/login'"));
      const result = await evaluate("({pathname:location.pathname,next:new URLSearchParams(location.search).get('next'),tenantId:new URLSearchParams(location.search).get('tenantId')})");
      if (result.pathname !== "/login" || !result.next?.startsWith("/")) {
        throw new Error(`${name} did not preserve a safe login return path`);
      }
      return { name, ...result };
    }

    const results = [];
    results.push(await verify("product wishlist", productUrl, "(()=>{const element=document.querySelector('button[aria-label=\"Add to wishlist\"]');if(!element)return false;element.click();return true})()"));
    results.push(await verify("add to cart", productUrl, "(()=>{const element=Array.from(document.querySelectorAll('button')).find((button)=>button.textContent.trim()==='Add to cart');if(!element)return false;element.click();return true})()"));
    results.push(await verify("buy now", productUrl, "(()=>{const element=Array.from(document.querySelectorAll('button')).find((button)=>button.textContent.trim()==='Buy Now');if(!element)return false;element.click();return true})()"));
    results.push(await verify("trade menu account", homeUrl, "(()=>{const menu=document.querySelector('.industrial-commerce-menu');const element=document.querySelector('.industrial-commerce-account');if(!menu||!element)return false;menu.open=true;element.click();return true})()"));
    results.push(await verify("header wishlist", homeUrl, "(()=>{const element=document.querySelector('a[aria-label^=\"Wishlist\"]');if(!element)return false;element.click();return true})()"));
    results.push(await verify("trade menu cart", homeUrl, "(()=>{const menu=document.querySelector('.industrial-commerce-menu');const element=document.querySelector('.industrial-commerce-panel-links>a[aria-label^=\"Cart\"]');if(!menu||!element)return false;menu.open=true;element.click();return true})()"));
    results.push(await verify("second-theme wishlist", footwearProductUrl, "(()=>{const element=document.querySelector('button[aria-label=\"Add to wishlist\"]');if(!element)return false;element.click();return true})()"));
    results.push(await verify("second-theme add to cart", footwearProductUrl, "(()=>{const element=Array.from(document.querySelectorAll('button')).find((button)=>button.textContent.trim()==='Add to cart');if(!element)return false;element.click();return true})()"));
    socket.close();
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  } finally {
    child.kill();
    await wait(300);
    const tempRoot = path.resolve(os.tmpdir());
    const resolvedProfile = path.resolve(profile);
    if (resolvedProfile.startsWith(`${tempRoot}${path.sep}`) && path.basename(resolvedProfile).startsWith("storefront-auth-guard-")) {
      fs.rmSync(resolvedProfile, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
