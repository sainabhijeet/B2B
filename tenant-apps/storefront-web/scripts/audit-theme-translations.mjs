import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.THEME_STORAGE_ROOT ?? "../../storage/themes");
const outputDir = path.resolve(process.env.THEME_TRANSLATION_REPORT_DIR ?? "../../docs");
const languages = (process.env.THEME_LANGUAGES ?? "en,hi,gu,ar,fr,es,de,ur,zh")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const ignoredKeys = new Set([
  "version", "storefrontKey", "templates", "tokens", "styles", "src", "url", "href", "link", "image", "icon",
  "imageLeft", "imageRight", "imageCenter", "background", "fontFamily", "fontWeight", "fontSize", "lineHeight",
  "borderRadius", "shadow", "color", "primary", "secondary", "surface", "text", "path", "manifestPath",
]);
const ignoredValues = /^(?:https?:\/\/|data:|assets[\\/]|\/storage\/|#|linear-gradient|radial-gradient|var\(|\$?\d|\^\d|[a-z0-9_-]+)$/iu;
const technicalFileValue = /\.(?:json|css|js|svg|png|jpe?g|webp|gif)(?:[?#].*)?$/iu;

function filesUnder(dir, name) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full, name));
    else if (entry.name === name) out.push(full);
  }
  return out;
}

function jsonFilesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!new Set(["tokens", "locales", "node_modules"]).has(entry.name)) out.push(...jsonFilesUnder(full));
    } else if (entry.name.endsWith(".json") && entry.name !== "theme.json") out.push(full);
  }
  return out;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function collectStrings(value, key, location, out) {
  if (typeof value === "string") {
    const text = value.trim();
    if (text && !ignoredKeys.has(key) && !ignoredValues.test(text) && !technicalFileValue.test(text)) out.push({ key: text, location });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, key, `${location}[${index}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) collectStrings(child, childKey, `${location}.${childKey}`, out);
  }
}

function themeDirs() {
  return filesUnder(root, "theme.json").map((file) => path.dirname(file));
}

const themes = [];
for (const dir of themeDirs()) {
  const manifestFile = path.join(dir, "theme.json");
  const manifest = readJson(manifestFile) ?? {};
  const sourceFiles = [manifestFile, ...jsonFilesUnder(dir)]
    .filter((file, index, all) => all.indexOf(file) === index);
  const strings = [];
  for (const file of sourceFiles) collectStrings(readJson(file), "", path.relative(dir, file), strings);
  const unique = [...new Map(strings.map((item) => [item.key, item])).values()];
  const localeEntries = {};
  for (const language of languages) localeEntries[language] = readJson(path.join(dir, "locales", `${language}.json`)) ?? {};
  const missing = [];
  const hardcoded = [];
  const localized = [];
  for (const item of unique) {
    const available = languages.filter((language) => typeof localeEntries[language][item.key] === "string" && localeEntries[language][item.key].trim());
    if (available.length === languages.length) localized.push({ ...item, classification: "Localized", languages: available });
    else {
      const classification = available.length ? "Hardcoded; Missing translation" : "Hardcoded; Translation key missing; Missing translation";
      const record = { ...item, classification, missingLanguages: languages.filter((language) => !available.includes(language)) };
      hardcoded.push(record);
      missing.push(record);
    }
  }
  themes.push({
    theme: manifest.storefrontKey ?? path.basename(dir),
    packagePath: path.relative(root, dir),
    sourceFiles: sourceFiles.map((file) => path.relative(dir, file)),
    stringCount: unique.length,
    localizedCount: localized.length,
    hardcodedCount: hardcoded.length,
    missingTranslationCount: missing.length,
    coveragePercent: unique.length ? Number(((localized.length / unique.length) * 100).toFixed(2)) : 100,
    strings: unique,
    missing,
  });
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "theme-translation-inventory.json"), JSON.stringify({ generatedAt: new Date().toISOString(), languages, themes }, null, 2) + "\n");
const lines = ["# Theme Translation Inventory", "", "This generated baseline identifies remaining migration work. It does not claim untranslated marketing content is complete.", "", `Configured languages: ${languages.join(", ")}`, `Themes audited: ${themes.length}`, ""];
for (const theme of themes.sort((a, b) => a.theme.localeCompare(b.theme))) {
  lines.push(`## ${theme.theme}`, "", `- Package: \`${theme.packagePath}\``, `- User-visible strings: ${theme.stringCount}`, `- Fully localized strings: ${theme.localizedCount}`, `- Hardcoded or incomplete strings: ${theme.hardcodedCount}`, `- Missing translation entries: ${theme.missingTranslationCount}`, `- Translation coverage: ${theme.coveragePercent}%`, "");
  if (theme.missing.length) {
    lines.push("| String | Location | Classification | Missing languages |", "|---|---|---|---|", ...theme.missing.slice(0, 200).map((item) => `| ${item.key.replaceAll("|", "\\|")} | ${item.location} | ${item.classification} | ${item.missingLanguages.join(", ")} |`), "");
  }
}
fs.writeFileSync(path.join(outputDir, "theme-translation-inventory.md"), lines.join("\n") + "\n");
console.log(JSON.stringify({ themes: themes.length, languages, strings: themes.reduce((sum, theme) => sum + theme.stringCount, 0), missing: themes.reduce((sum, theme) => sum + theme.missingTranslationCount, 0) }));
