import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appRoot, "../..");
const catalogFile = path.join(appRoot, "registry", "sectionCatalog.ts");
const registryFile = path.join(appRoot, "registry", "sectionRegistry.ts");
const themeRoots = [
  path.join(repoRoot, "backend", "storage", "themes", "web"),
  path.join(repoRoot, "storage", "themes", "web"),
];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`Invalid theme JSON: ${path.relative(repoRoot, file)} (${error.message})`);
  }
}

function filesUnder(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...filesUnder(full, predicate));
    else if (predicate(full)) files.push(full);
  }
  return files;
}

function supportedSectionTypes() {
  const catalogSource = fs.readFileSync(catalogFile, "utf8");
  const registrySource = fs.readFileSync(registryFile, "utf8");
  const rawCatalog = catalogSource.match(/const RAW_ECATALOG_TYPES = \[([\s\S]*?)\]\s*as const;/u)?.[1];
  if (!rawCatalog) throw new Error("Unable to read RAW_ECATALOG_TYPES from sectionCatalog.ts");
  const aliases = catalogSource.match(/LEGACY_SECTION_TYPE_ALIASES[^=]*= \{([\s\S]*?)\n\};/u)?.[1];
  const implementations = registrySource.match(/const sectionImplementations[^=]*= \{([\s\S]*?)\n\};\n\nfunction buildRegistry/u)?.[1];
  if (!aliases || !implementations) throw new Error("Unable to read registry contracts");

  const supported = new Set([...rawCatalog.matchAll(/"([^"]+)"/gu)].map((match) => match[1].trim().toLowerCase()));
  const entryPattern = /^ {2}(?:"([^"]+)"|([a-z][a-z0-9-]*)):\s*/gmu;
  for (const source of [aliases, implementations]) {
    for (const match of source.matchAll(entryPattern)) supported.add((match[1] ?? match[2]).toLowerCase());
  }
  return supported;
}

function addAllowedSections(manifest, records, source) {
  const lists = [
    manifest.allowedSections,
    manifest.allowed_sections,
    manifest.capabilities?.allowedSections,
    manifest.capabilities?.allowed_sections,
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const type of list) {
      if (typeof type === "string" && type.trim()) {
        records.push({ type: type.trim().toLowerCase(), source });
      }
    }
  }
}

function addTemplateSections(value, records, source) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) addTemplateSections(item, records, source);
    return;
  }
  if (!Array.isArray(value.sections)) return;
  for (const section of value.sections) {
    if (section && typeof section.type === "string" && section.type.trim()) {
      records.push({ type: section.type.trim().toLowerCase(), source });
    }
  }
}

const supported = supportedSectionTypes();
const records = [];
let themeCount = 0;

for (const root of themeRoots) {
  for (const manifestFile of filesUnder(root, (file) => path.basename(file) === "theme.json")) {
    themeCount += 1;
    const themeDir = path.dirname(manifestFile);
    addAllowedSections(readJson(manifestFile), records, path.relative(repoRoot, manifestFile));
    const templatesDir = path.join(themeDir, "templates");
    for (const templateFile of filesUnder(templatesDir, (file) => file.endsWith(".json"))) {
      addTemplateSections(readJson(templateFile), records, path.relative(repoRoot, templateFile));
    }
  }
}

const unknown = records.filter(({ type }) => !supported.has(type));
if (unknown.length) {
  const unique = [...new Map(unknown.map((record) => [`${record.type}:${record.source}`, record])).values()];
  console.error("[themes:contracts:audit] Unsupported section contracts found:");
  for (const record of unique) console.error(`- ${record.type} (${record.source})`);
  process.exit(1);
}

console.log(`[themes:contracts:audit] OK - ${themeCount} themes, ${records.length} section contracts`);
