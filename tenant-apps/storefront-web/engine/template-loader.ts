import { backendOriginFromApiUrl } from "@/lib/api-origin";
import { directoryUrlFromManifestPath } from "@/engine/manifest-url";
import {
  TemplateFileSchema,
  ThemeManifestSchema,
  type BlockInstance,
  type TemplateFile,
  type SectionInstance,
} from "@/engine/schema/theme-engine.schema";

export function buildAbsoluteThemeAssetUrl(manifestPath: string, relativePath: string): string {
  const dir = directoryUrlFromManifestPath(manifestPath);
  const rel = relativePath.replace(/^\/+/u, "");
  if (/^https?:\/\//iu.test(dir)) {
    const base = dir.endsWith("/") ? dir : `${dir}/`;
    return new URL(rel, base).toString();
  }
  const origin = backendOriginFromApiUrl();
  const basePath = (dir.startsWith("/") ? dir : `/${dir}`).replace(/\/*$/u, "/");
  return `${origin.replace(/\/*$/u, "")}${basePath}${rel}`;
}

/** Fetch and validate a template JSON (e.g. `templates/home.json`) relative to `theme.json`. */
export async function loadTemplateJson(
  manifestPath: string,
  templateRelativePath: string,
): Promise<TemplateFile | null> {
  const url = buildAbsoluteThemeAssetUrl(manifestPath, templateRelativePath);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    const parsed = TemplateFileSchema.safeParse(raw);
    return parsed.success ? absolutizeTemplateAssetPaths(parsed.data, manifestPath) : null;
  } catch {
    return null;
  }
}

export type TemplatePageType = "home" | "category" | "product";

export async function loadTemplateForPage(
  manifestPath: string | null | undefined,
  manifest: Record<string, unknown> | null,
  page: TemplatePageType,
): Promise<TemplateFile | null> {
  if (!manifestPath || !manifest) return null;
  const parsed = ThemeManifestSchema.safeParse(manifest);
  if (!parsed.success) return null;
  const rel = parsed.data.templates?.[page];
  if (typeof rel !== "string" || !rel.trim()) return null;
  return loadTemplateJson(manifestPath, rel.trim());
}

/** Load a theme-provided locale dictionary with English as the UI fallback source. */
export async function loadThemeLocale(
  manifestPath: string | null | undefined,
  manifest: Record<string, unknown> | null,
  languageCode: string,
): Promise<Record<string, string>> {
  if (!manifestPath || !manifest) return {};
  const parsed = ThemeManifestSchema.safeParse(manifest);
  if (!parsed.success) return {};
  const code = languageCode.trim().toLowerCase().split("-")[0];
  const configured = parsed.data.locales?.[code];
  const relativePath = typeof configured === "string" && configured.trim()
    ? configured.trim()
    : `locales/${code}.json`;
  const englishConfigured = parsed.data.locales?.en;
  const englishPath = typeof englishConfigured === "string" && englishConfigured.trim()
    ? englishConfigured.trim()
    : "locales/en.json";
  const loadDictionary = async (relative: string): Promise<Record<string, string>> => {
    const res = await fetch(buildAbsoluteThemeAssetUrl(manifestPath, relative), { cache: "no-store" });
    if (!res.ok) return {};
    const raw = (await res.json()) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
  };
  try {
    const base = code === "en" ? {} : await loadDictionary(englishPath);
    const selected = await loadDictionary(relativePath);
    return { ...base, ...selected };
  } catch {
    return {};
  }
}

function absolutizeAssetUrl(manifestPath: string, value: string): string {
  if (!value) return value;
  if (/^https?:\/\//iu.test(value) || value.startsWith("data:")) {
    return value;
  }
  if (value.startsWith("/storage/")) {
    return `${backendOriginFromApiUrl().replace(/\/*$/u, "")}${value}`;
  }
  if (value.startsWith("/")) return value;
  const dir = directoryUrlFromManifestPath(manifestPath);
  const rel = value.replace(/^\/+/u, "");
  if (/^https?:\/\//iu.test(dir)) {
    const base = dir.endsWith("/") ? dir : `${dir}/`;
    return new URL(rel, base).toString();
  }
  const origin = backendOriginFromApiUrl();
  const basePath = (dir.startsWith("/") ? dir : `/${dir}`).replace(/\/*$/u, "/");
  return `${origin.replace(/\/*$/u, "")}${basePath}${rel}`;
}

function absolutizeSettings(settings: Record<string, unknown>, manifestPath: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(settings)) {
    const key = k.toLowerCase();
    const isIconKey = key === "icon";
    const shouldResolve =
      key.includes("image") ||
      key.includes("gallery") ||
      key.includes("background") ||
      key.includes("thumbnail") ||
      key.endsWith("url") ||
      key.endsWith("src") ||
      key.endsWith("path");
    if (typeof v === "string") {
      const pathLikeIcon = isIconKey && /[/.\\]/u.test(v);
      out[k] = shouldResolve || pathLikeIcon ? absolutizeAssetUrl(manifestPath, v) : v;
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) => {
        if (typeof item === "string") {
          return shouldResolve ? absolutizeAssetUrl(manifestPath, item) : item;
        }
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return absolutizeSettings(item as Record<string, unknown>, manifestPath);
        }
        return item;
      });
      continue;
    }
    if (v && typeof v === "object") {
      out[k] = absolutizeSettings(v as Record<string, unknown>, manifestPath);
      continue;
    }
    out[k] = v;
  }
  return out;
}

function absolutizeBlockAssets(block: BlockInstance, manifestPath: string): BlockInstance {
  const o = block as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : undefined;
  const type = typeof o.type === "string" ? o.type : "";
  const variant = typeof o.variant === "string" ? o.variant : undefined;
  const settingsObj =
    o.settings && typeof o.settings === "object" && !Array.isArray(o.settings)
      ? { ...(o.settings as Record<string, unknown>) }
      : {};
  const reserved = new Set(["id", "type", "variant", "settings"]);
  for (const [k, v] of Object.entries(o)) {
    if (reserved.has(k)) continue;
    if (v !== undefined) settingsObj[k] = v;
  }
  return {
    ...o,
    id,
    type,
    variant,
    settings: absolutizeSettings(settingsObj, manifestPath),
  } as BlockInstance;
}

function absolutizeTemplateAssetPaths(template: TemplateFile, manifestPath: string): TemplateFile {
  const sections: SectionInstance[] = template.sections.map((section) => {
    const next: SectionInstance = { ...section };
    if (section.settings) {
      next.settings = absolutizeSettings(section.settings, manifestPath);
    }
    if (section.blocks?.length) {
      next.blocks = section.blocks.map((b) => absolutizeBlockAssets(b as BlockInstance, manifestPath));
    }
    if (section.columns?.length) {
      next.columns = section.columns.map((col) => ({
        ...col,
        blocks: col.blocks.map((b) => absolutizeBlockAssets(b as BlockInstance, manifestPath)),
      }));
    }
    return next;
  });
  return { ...template, sections };
}

/**
 * Fetch runtime theme CSS from `manifestPath` returned by the themes API (ZIP is unpacked only on the server).
 */
export async function loadThemeCssText(
  manifestPath: string | null | undefined,
  manifest: Record<string, unknown> | null,
): Promise<string | null> {
  if (!manifestPath) return null;
  let relCss = "assets/css/theme.css";
  if (manifest && typeof manifest === "object") {
    const m = manifest as Record<string, unknown>;
    const assets = m.assets;
    if (assets && typeof assets === "object" && !Array.isArray(assets)) {
      const css = (assets as Record<string, unknown>).css;
      if (typeof css === "string" && css.trim()) relCss = css.trim();
    }
    // Backward compatibility: older themes used `styles.main`.
    const styles = m.styles;
    if (styles && typeof styles === "object" && !Array.isArray(styles)) {
      const mainCss = (styles as Record<string, unknown>).main;
      if (typeof mainCss === "string" && mainCss.trim()) relCss = mainCss.trim();
    }
  }
  const cssUrl = buildAbsoluteThemeAssetUrl(manifestPath, relCss);
  try {
    const res = await fetch(cssUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim() ? text : null;
  } catch {
    return null;
  }
}

/** If manifest lists `templates.home`, fetch that file relative to `theme.json`. */
export async function loadHomeTemplateFromResolved(
  manifestPath: string | null | undefined,
  manifest: Record<string, unknown> | null,
): Promise<TemplateFile | null> {
  if (!manifestPath || !manifest) return null;
  const parsed = ThemeManifestSchema.safeParse(manifest);
  if (!parsed.success) return null;
  const home = parsed.data.templates?.home;
  if (typeof home !== "string" || !home.trim()) return null;
  return loadTemplateJson(manifestPath, home.trim());
}

export type ComponentSchema = {
  variants?: string[];
  defaultVariant?: string;
  settings?: Record<string, unknown>;
};

export async function loadThemeComponentSchemas(
  manifestPath: string | null | undefined,
  manifest: Record<string, unknown> | null,
): Promise<Record<string, ComponentSchema>> {
  if (!manifestPath || !manifest) return {};
  const parsed = ThemeManifestSchema.safeParse(manifest);
  if (!parsed.success) return {};
  const components = parsed.data.components;
  if (!components) return {};
  const out: Record<string, ComponentSchema> = {};
  for (const [key, rel] of Object.entries(components)) {
    if (!rel.trim()) continue;
    try {
      const res = await fetch(buildAbsoluteThemeAssetUrl(manifestPath, rel.trim()), { cache: "no-store" });
      if (!res.ok) continue;
      const raw = (await res.json()) as unknown;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      out[key.toLowerCase()] = raw as ComponentSchema;
    } catch {
      continue;
    }
  }
  return out;
}
