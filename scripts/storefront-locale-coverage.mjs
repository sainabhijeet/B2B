import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "shared", "locales", "storefront");
const allowedSameValues = new Set([
  "FAQ",
  "UPI",
  "OTP",
  "GST",
  "B2B",
  "LumaCart",
  "Gurugram, India",
  "Nova X Pro 5G Smartphone",
]);
const allowedSameKeys = new Set([
  "pages.gurugram",
  "pages.novaPhone",
]);

function flatten(value, prefix = "", out = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    if (key === "meta" || key === "_aliases") continue;
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") out[next] = child;
    else flatten(child, next, out);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const english = flatten(readJson(path.join(sourceDir, "en.json")));
let failed = false;
for (const file of fs.readdirSync(sourceDir).filter((name) => name.endsWith(".json") && name !== "en.json")) {
  const locale = flatten(readJson(path.join(sourceDir, file)));
  const same = Object.entries(english)
    .filter(([key, value]) => {
      if (!value || allowedSameKeys.has(key) || allowedSameValues.has(value)) return false;
      return locale[key] === value;
    })
    .map(([key]) => key);
  console.log(`${file}: english-copy=${same.length}`);
  if (same.length) {
    failed = true;
    console.log(`  ${same.join(", ")}`);
  }
}
if (failed) process.exitCode = 1;
