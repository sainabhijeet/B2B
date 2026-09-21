import { ThemeManifestSchema } from "@/engine/schema/theme-engine.schema";
import { buildAbsoluteThemeAssetUrl } from "@/engine/template-loader";

type TokenMap = Record<string, unknown>;

const THEME_COLOR_ALIASES: Record<string, string[]> = {
  primary: ["theme-primary", "color-primary"],
  secondary: ["theme-secondary", "color-secondary"],
  surface: ["theme-surface", "color-surface", "background"],
  background: ["theme-background", "background"],
  ink: ["theme-text", "color-text", "foreground"],
  text: ["theme-text", "color-text", "foreground"],
  muted: ["theme-muted", "color-muted"],
  accent: ["theme-accent", "color-accent"],
};

function toKebab(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function addAliasVars(name: string, value: string, out: Array<[string, string]>): void {
  const aliases = THEME_COLOR_ALIASES[name];
  if (!aliases) return;
  for (const alias of aliases) out.push([alias, value]);
}

function flattenTokens(prefix: string, input: TokenMap, out: Array<[string, string]>): void {
  for (const [key, value] of Object.entries(input)) {
    const kebabKey = toKebab(key);
    const next = prefix ? `${prefix}-${kebabKey}` : kebabKey;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const str = String(value);
      out.push([next, str]);
      if (prefix === "color" || prefix === "theme") addAliasVars(kebabKey, str, out);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenTokens(next, value as TokenMap, out);
    }
  }
}

function normalizeTokenObject(raw: TokenMap, unwrapKey: string): TokenMap {
  const nested = raw[unwrapKey];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as TokenMap;
  }
  return raw;
}

async function loadTokenFile(manifestPath: string, relPath: string | undefined): Promise<TokenMap | null> {
  if (!relPath?.trim()) return null;
  try {
    const res = await fetch(buildAbsoluteThemeAssetUrl(manifestPath, relPath.trim()), { cache: "no-store" });
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    return raw as TokenMap;
  } catch {
    return null;
  }
}

function flattenMonolithTokens(monolith: TokenMap, pairs: Array<[string, string]>): void {
  const colors = monolith.colors;
  if (colors && typeof colors === "object" && !Array.isArray(colors)) {
    flattenTokens("color", normalizeTokenObject(colors as TokenMap, "colors"), pairs);
  }
  const typography = monolith.typography;
  if (typography && typeof typography === "object" && !Array.isArray(typography)) {
    flattenTokens("font", typography as TokenMap, pairs);
  }
  const spacing = monolith.spacing;
  if (spacing && typeof spacing === "object" && !Array.isArray(spacing)) flattenTokens("space", spacing as TokenMap, pairs);
  const layout = monolith.layout;
  if (layout && typeof layout === "object" && !Array.isArray(layout)) flattenTokens("layout", layout as TokenMap, pairs);
  const radius = monolith.radius;
  if (radius && typeof radius === "object" && !Array.isArray(radius)) flattenTokens("radius", radius as TokenMap, pairs);
  const shadows = monolith.shadows;
  if (shadows && typeof shadows === "object" && !Array.isArray(shadows)) flattenTokens("shadow", shadows as TokenMap, pairs);
  const breakpoints = monolith.breakpoints;
  if (breakpoints && typeof breakpoints === "object" && !Array.isArray(breakpoints)) {
    flattenTokens("bp", breakpoints as TokenMap, pairs);
  }
}

export async function loadThemeTokenVarsCss(
  manifestPath: string | null | undefined,
  manifest: Record<string, unknown> | null,
): Promise<string | null> {
  if (!manifestPath || !manifest) return null;
  const parsed = ThemeManifestSchema.safeParse(manifest);
  if (!parsed.success || !parsed.data.tokens) return null;
  const tokens = parsed.data.tokens;

  const pairs: Array<[string, string]> = [];

  if (typeof tokens === "string") {
    const monolith = await loadTokenFile(manifestPath, tokens);
    if (monolith) flattenMonolithTokens(monolith, pairs);
  } else {
    const colors = await loadTokenFile(manifestPath, tokens.colors);
    const typography = await loadTokenFile(manifestPath, tokens.typography);
    const spacing = await loadTokenFile(manifestPath, tokens.spacing);
    const layout = await loadTokenFile(manifestPath, tokens.layout);
    const radius = await loadTokenFile(manifestPath, tokens.radius);
    const shadows = await loadTokenFile(manifestPath, tokens.shadows);
    const breakpoints = await loadTokenFile(manifestPath, tokens.breakpoints);

    if (colors) flattenTokens("color", normalizeTokenObject(colors, "colors"), pairs);
    if (typography) flattenTokens("font", typography, pairs);
    if (spacing) flattenTokens("space", spacing, pairs);
    if (layout) flattenTokens("layout", layout, pairs);
    if (radius) flattenTokens("radius", radius, pairs);
    if (shadows) flattenTokens("shadow", shadows, pairs);
    if (breakpoints) flattenTokens("bp", breakpoints, pairs);
  }

  if (!pairs.length) return null;

  const unique = new Map<string, string>();
  for (const [k, v] of pairs) unique.set(k, v);
  const body = [...unique.entries()].map(([k, v]) => `  --${k}: ${v};`).join("\n");
  return `:root {\n${body}\n}`;
}

export function tokenOverridesToCss(overrides: Record<string, unknown> | null | undefined): string | null {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return null;
  const pairs: Array<[string, string]> = [];
  const raw = overrides as TokenMap;
  const normalized = {
    ...raw,
    ...(raw.colors && typeof raw.colors === "object" && !Array.isArray(raw.colors) ? (raw.colors as TokenMap) : {}),
  };
  flattenTokens("tenant", normalized, pairs);
  flattenTokens("", normalized, pairs);
  if (typeof normalized.colorPrimary === "string") addAliasVars("primary", normalized.colorPrimary, pairs);
  if (typeof normalized.colorSecondary === "string") addAliasVars("secondary", normalized.colorSecondary, pairs);
  if (typeof normalized.colorSurface === "string") addAliasVars("surface", normalized.colorSurface, pairs);
  if (typeof normalized.colorText === "string") addAliasVars("text", normalized.colorText, pairs);
  if (!pairs.length) return null;
  const unique = new Map<string, string>();
  for (const [k, v] of pairs) {
    if (!k) continue;
    unique.set(k, v);
  }
  const body = [...unique.entries()].map(([k, v]) => `  --${k}: ${v};`).join("\n");
  return `:root {\n${body}\n}`;
}
