import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appRoot, "../..");
const lockFile = path.join(appRoot, "registry", "locked-theme-designs.json");
const locks = JSON.parse(fs.readFileSync(lockFile, "utf8"));
const failures = [];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assertLockedFile(root, slug, relativeFile, approvedHash) {
  const file = path.join(root, slug, ...relativeFile.split("/"));
  if (!fs.existsSync(file)) {
    failures.push(`missing ${path.relative(repoRoot, file)}`);
    return;
  }
  const actualHash = sha256(file);
  if (actualHash !== approvedHash) {
    failures.push(`changed ${path.relative(repoRoot, file)} (expected ${approvedHash}, received ${actualHash})`);
  }
}

const themeRoots = [
  path.join(repoRoot, "storage", "themes", "web"),
  path.join(repoRoot, "backend", "storage", "themes", "web"),
];

for (const [slug, lock] of Object.entries(locks)) {
  if (lock.status !== "locked") continue;
  for (const root of themeRoots) {
    for (const [relativeFile, approvedHash] of Object.entries(lock.files)) {
      assertLockedFile(root, slug, relativeFile, approvedHash);
    }

    const manifestFile = path.join(root, slug, "theme.json");
    if (!fs.existsSync(manifestFile)) {
      failures.push(`missing ${path.relative(repoRoot, manifestFile)}`);
      continue;
    }
    const manifest = readJson(manifestFile);
    if (manifest.version !== lock.approvedVersion) failures.push(`unexpected version in ${path.relative(repoRoot, manifestFile)}`);
    if (manifest.designSystem?.id !== lock.designId) failures.push(`unexpected designSystem.id in ${path.relative(repoRoot, manifestFile)}`);
    if (manifest.designSystem?.header !== "editorial-jowenly") failures.push(`Jewelry header variant changed in ${path.relative(repoRoot, manifestFile)}`);
    if (manifest.designSystem?.hero !== "jowenly-campaign") failures.push(`Jewelry hero variant changed in ${path.relative(repoRoot, manifestFile)}`);
    if (manifest.designSystem?.footer !== "newsletter-led") failures.push(`Jewelry footer variant changed in ${path.relative(repoRoot, manifestFile)}`);
  }
}

const headerSource = fs.readFileSync(path.join(appRoot, "sections", "Header.tsx"), "utf8");
const footerSource = fs.readFileSync(path.join(appRoot, "sections", "FooterColumns.tsx"), "utf8");
const sharedContracts = [
  [headerSource.includes('variant === "editorial-jowenly"'), "shared Header no longer preserves the Aurelia variant"],
  [headerSource.includes("AureliaCollectionsMenu"), "shared Header no longer preserves the Aurelia collections menu"],
  [footerSource.includes('designId === "ds-06-web-aurelia-elan"'), "shared Footer no longer recognizes the locked Aurelia design"],
  [footerSource.includes("preserveAureliaDesign ? null : assuranceStrip"), "shared Footer no longer protects Aurelia from the global assurance strip"],
];
for (const [valid, message] of sharedContracts) if (!valid) failures.push(message);

if (failures.length > 0) {
  console.error("[themes:design-lock:audit] LOCK VIOLATION - Jewelry / Diamond is owner-approved and immutable without explicit owner permission:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[themes:design-lock:audit] OK - ${Object.keys(locks).length} owner-approved theme design locked`);
