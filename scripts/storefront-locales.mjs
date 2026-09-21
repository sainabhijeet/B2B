import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "shared", "locales", "storefront");
const targets = [
  path.join(root, "tenant-apps", "storefront-web", "locales", "storefront"),
  path.join(root, "tenant-apps", "mobile-app", "assets", "locales", "storefront"),
];

function flatten(value, prefix = "", out = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    if (key === "meta" || key === "_aliases") continue;
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") out[next] = child;
    else if (child && typeof child === "object" && !Array.isArray(child)) {
      const keys = Object.keys(child);
      const plural = keys.some((k) => ["zero", "one", "two", "few", "many", "other"].includes(k));
      if (plural) out[next] = child;
      else flatten(child, next, out);
    }
  }
  return out;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function sync() {
  const files = (await fs.readdir(sourceDir)).filter((name) => name.endsWith(".json"));
  for (const target of targets) {
    await fs.mkdir(target, { recursive: true });
    for (const file of files) {
      await fs.copyFile(path.join(sourceDir, file), path.join(target, file));
    }
  }
  console.log(`[storefront-locales] synced ${files.length} locale files`);
}

async function validate() {
  const files = (await fs.readdir(sourceDir)).filter((name) => name.endsWith(".json"));
  const english = flatten(await readJson(path.join(sourceDir, "en.json")));
  const baseKeys = new Set(Object.keys(english));
  let failed = false;
  for (const file of files) {
    const locale = flatten(await readJson(path.join(sourceDir, file)));
    const keys = new Set(Object.keys(locale));
    const missing = [...baseKeys].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !baseKeys.has(key));
    const empty = Object.entries(locale)
      .filter(([, value]) => typeof value === "string" && !value.trim())
      .map(([key]) => key);
    if (missing.length || extra.length || empty.length) failed = true;
    console.log(
      `${file}: missing=${missing.length} extra=${extra.length} empty=${empty.length}`,
    );
    if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
    if (extra.length) console.log(`  extra: ${extra.join(", ")}`);
    if (empty.length) console.log(`  empty: ${empty.join(", ")}`);
  }
  if (failed) process.exitCode = 1;
}

const command = process.argv[2] ?? "validate";
if (command === "sync") await sync();
else if (command === "validate") await validate();
else {
  console.error("Usage: node scripts/storefront-locales.mjs [sync|validate]");
  process.exitCode = 2;
}
