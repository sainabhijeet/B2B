import { ThemeManifestSchema } from "@/engine/schema/theme-engine.schema";
import { buildAbsoluteThemeAssetUrl } from "@/engine/template-loader";

type TokenMap = Record<string, unknown>;

type BrandingColors = {
  primaryColor?: unknown;
  secondaryColor?: unknown;
};

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

function contrastForHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/iu);
  if (!match) return null;
  const expanded = match[1].length === 3
    ? match[1].split("").map((digit) => `${digit}${digit}`).join("")
    : match[1];
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const luminance = rgb
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkLuminance = 0.0103;
  const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
  return whiteContrast >= darkContrast ? "#ffffff" : "#111827";
}

function safeCssColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(color)) return color;
  if (/^(?:rgb|rgba|hsl|hsla)\([\d.%\s,+/-]+\)$/iu.test(color)) return color;
  return null;
}

function firstColor(values: unknown[]): string | null {
  for (const value of values) {
    const color = safeCssColor(value);
    if (color) return color;
  }
  return null;
}

function addTenantBrandPalette(
  primary: string,
  secondary: string | null,
  primaryContrast: string,
  out: Array<[string, string]>,
): void {
  const secondaryValue = secondary || "color-mix(in srgb, var(--tenant-brand-primary) 68%, #ffffff)";
  const secondaryContrast = contrastForHex(secondary) || primaryContrast;
  const values: Record<string, string> = {
    "tenant-brand-primary": primary,
    "tenant-brand-secondary": secondaryValue,
    "tenant-brand-primary-contrast": primaryContrast,
    "tenant-brand-secondary-contrast": secondaryContrast,
    "tenant-brand-soft": "color-mix(in srgb, var(--tenant-brand-primary) 8%, #ffffff)",
    "tenant-brand-soft-strong": "color-mix(in srgb, var(--tenant-brand-primary) 16%, #ffffff)",
    "tenant-brand-surface": "color-mix(in srgb, var(--tenant-brand-primary) 4%, #ffffff)",
    "tenant-brand-background": "color-mix(in srgb, var(--tenant-brand-primary) 7%, #ffffff)",
    "tenant-brand-ink": "color-mix(in srgb, var(--tenant-brand-primary) 18%, #111827)",
    "tenant-brand-deep": "color-mix(in srgb, var(--tenant-brand-primary) 28%, #07111f)",
    "tenant-brand-panel": "color-mix(in srgb, var(--tenant-brand-primary) 22%, #111d24)",
    "tenant-brand-muted": "color-mix(in srgb, var(--tenant-brand-primary) 14%, #64748b)",
    "tenant-brand-line": "color-mix(in srgb, var(--tenant-brand-primary) 22%, transparent)",

    // Standard storefront and uploaded-theme token contracts.
    "theme-primary": "var(--tenant-brand-primary)",
    "theme-secondary": "var(--tenant-brand-secondary)",
    "theme-accent": "var(--tenant-brand-secondary)",
    "theme-primary-contrast": "var(--tenant-brand-primary-contrast)",
    "theme-secondary-contrast": "var(--tenant-brand-secondary-contrast)",
    "theme-surface": "var(--tenant-brand-surface)",
    "theme-background": "var(--tenant-brand-background)",
    "theme-card": "var(--tenant-brand-surface)",
    "theme-text": "var(--tenant-brand-ink)",
    "theme-muted": "var(--tenant-brand-muted)",
    "theme-border": "var(--tenant-brand-line)",
    "color-primary": "var(--tenant-brand-primary)",
    "color-secondary": "var(--tenant-brand-secondary)",
    "color-accent": "var(--tenant-brand-secondary)",
    "color-surface": "var(--tenant-brand-surface)",
    "color-text": "var(--tenant-brand-ink)",
    "color-muted": "var(--tenant-brand-muted)",
    primary: "var(--tenant-brand-primary)",
    secondary: "var(--tenant-brand-secondary)",
    accent: "var(--tenant-brand-secondary)",
    "primary-dark": "var(--tenant-brand-deep)",
    bg: "var(--tenant-brand-background)",
    surface: "var(--tenant-brand-surface)",
    ink: "var(--tenant-brand-ink)",
    muted: "var(--tenant-brand-muted)",
    border: "var(--tenant-brand-line)",
    "header-primary": "var(--tenant-brand-primary)",
    "header-secondary": "var(--tenant-brand-secondary)",
    "header-soft": "var(--tenant-brand-soft)",

    // Shared premium theme family.
    "premium-paper": "var(--tenant-brand-surface)",
    "premium-soft": "var(--tenant-brand-soft)",
    "premium-deep": "var(--tenant-brand-deep)",
    "premium-line": "var(--tenant-brand-line)",

    // Electronics / CircuitLane.
    "circuit-accent": "var(--tenant-brand-primary)",
    "circuit-accent-2": "var(--tenant-brand-secondary)",
    "circuit-soft": "var(--tenant-brand-soft)",
    "circuit-ink": "var(--tenant-brand-deep)",
    "circuit-panel": "var(--tenant-brand-panel)",
    "circuit-line": "var(--tenant-brand-line)",

    // Machinery / MotionForge.
    "mf-signal": "var(--tenant-brand-primary)",
    "mf-ink": "var(--tenant-brand-deep)",
    "mf-panel": "var(--tenant-brand-panel)",
    "mf-steel": "var(--tenant-brand-muted)",
    "mf-paper": "var(--tenant-brand-background)",
    "mf-line": "var(--tenant-brand-line)",

    // PlantWorks industrial family.
    "pw-orange": "var(--tenant-brand-primary)",
    "pw-accent-2": "var(--tenant-brand-secondary)",
    "pw-ink": "var(--tenant-brand-ink)",
    "pw-panel": "var(--tenant-brand-panel)",
    "pw-steel": "var(--tenant-brand-soft-strong)",
    "pw-paper": "var(--tenant-brand-background)",
    "pw-mint": "var(--tenant-brand-soft-strong)",
    "pw-line": "var(--tenant-brand-line)",
    "pw-muted": "var(--tenant-brand-muted)",
    "pw-card": "var(--tenant-brand-surface)",
    "pw-soft": "var(--tenant-brand-soft)",
    "pw-shadow": "color-mix(in srgb, var(--tenant-brand-primary) 14%, transparent)",

    // Footwear editorial family.
    "stride-wine": "var(--tenant-brand-primary)",
    "stride-wine-deep": "var(--tenant-brand-deep)",
    "stride-cognac": "var(--tenant-brand-secondary)",
    "stride-clay": "var(--tenant-brand-secondary)",
    "stride-sand": "var(--tenant-brand-soft-strong)",
    "stride-blush": "var(--tenant-brand-soft)",
    "stride-cream": "var(--tenant-brand-background)",
    "stride-paper": "var(--tenant-brand-surface)",
    "stride-ivory": "var(--tenant-brand-surface)",
    "stride-espresso": "var(--tenant-brand-deep)",
    "stride-ink": "var(--tenant-brand-ink)",
    "stride-line": "var(--tenant-brand-line)",

    // Jewellery / Aurora and legacy luxury contracts.
    "aurora-primary": "var(--tenant-brand-primary)",
    "aurora-accent": "var(--tenant-brand-secondary)",
    "aurora-secondary": "var(--tenant-brand-deep)",
    "aurora-surface": "var(--tenant-brand-surface)",
    "aurora-text": "var(--tenant-brand-ink)",
    "aurora-muted": "var(--tenant-brand-muted)",
    "aurora-border": "var(--tenant-brand-line)",
    "lc-primary": "var(--tenant-brand-primary)",
    "lc-primary-light": "var(--tenant-brand-secondary)",
    "lc-primary-dark": "var(--tenant-brand-deep)",
    "lc-secondary": "var(--tenant-brand-secondary)",
    "lc-gold": "var(--tenant-brand-secondary)",
    "lc-rose": "var(--tenant-brand-primary)",
    "lc-green": "var(--tenant-brand-secondary)",
    "lc-bg": "var(--tenant-brand-background)",
    "lc-surface": "var(--tenant-brand-surface)",
    "lc-card": "var(--tenant-brand-surface)",
    "lc-ink": "var(--tenant-brand-ink)",
    "lc-muted": "var(--tenant-brand-muted)",
    "lc-line": "var(--tenant-brand-line)",
    "bs-body-bg": "var(--tenant-brand-surface)",
    "bs-btn-bg": "var(--tenant-brand-primary)",
    "bs-btn-border-color": "var(--tenant-brand-primary)",
    "bs-btn-hover-bg": "var(--tenant-brand-secondary)",
    "bs-btn-hover-border-color": "var(--tenant-brand-secondary)",

    // Remaining uploaded legacy theme contracts.
    "rg-primary": "var(--tenant-brand-primary)",
    "rg-accent": "var(--tenant-brand-primary)",
    "rg-accent-alt": "var(--tenant-brand-secondary)",
    "rg-bg": "var(--tenant-brand-background)",
    "rg-surface": "var(--tenant-brand-surface)",
    "rg-surface-alt": "var(--tenant-brand-soft)",
    "rg-ink": "var(--tenant-brand-ink)",
    "rg-muted": "var(--tenant-brand-muted)",
    "rg-border": "var(--tenant-brand-line)",
    "cb2b-accent": "var(--tenant-brand-primary)",
    "cb2b-bg": "var(--tenant-brand-background)",
    "cb2b-surface": "var(--tenant-brand-surface)",
    "cb2b-ink": "var(--tenant-brand-ink)",
    "cb2b-muted": "var(--tenant-brand-muted)",
    "cb2b-border": "var(--tenant-brand-line)",
    "localization-test-primary": "var(--tenant-brand-primary)",
    "localization-test-accent": "var(--tenant-brand-secondary)",
    "localization-test-soft": "var(--tenant-brand-soft)",
    "localization-test-surface": "var(--tenant-brand-surface)",
    "localization-test-ink": "var(--tenant-brand-ink)",
    "localization-test-muted": "var(--tenant-brand-muted)",
    "localization-test-border": "var(--tenant-brand-line)",
  };

  for (const [name, value] of Object.entries(values)) out.push([name, value]);
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
    const res = await fetch(buildAbsoluteThemeAssetUrl(manifestPath, relPath.trim()), { next: { revalidate: 30 } });
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

export function tokenOverridesToCss(
  overrides: Record<string, unknown> | null | undefined,
  branding?: BrandingColors | null,
): string | null {
  const pairs: Array<[string, string]> = [];
  const raw = overrides && typeof overrides === "object" && !Array.isArray(overrides)
    ? overrides as TokenMap
    : {};
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
  const nestedColors = raw.colors && typeof raw.colors === "object" && !Array.isArray(raw.colors)
    ? raw.colors as TokenMap
    : {};
  const primaryOverride = firstColor([
    normalized.colorPrimary,
    normalized.primary,
    nestedColors.colorPrimary,
    nestedColors.primary,
    branding?.primaryColor,
  ]);
  const secondaryOverride = firstColor([
    normalized.colorSecondary,
    normalized.secondary,
    nestedColors.colorSecondary,
    nestedColors.secondary,
    branding?.secondaryColor,
  ]);
  if (primaryOverride) {
    addTenantBrandPalette(
      primaryOverride,
      secondaryOverride,
      contrastForHex(primaryOverride) || "#ffffff",
      pairs,
    );
  }
  if (!pairs.length) return null;
  const unique = new Map<string, string>();
  for (const [k, v] of pairs) {
    if (!k) continue;
    unique.set(k, v);
  }
  const body = [...unique.entries()].map(([k, v]) => `  --${k}: ${v};`).join("\n");
  // Theme packages declare their defaults on both :root and scoped body
  // selectors. Tenant values therefore need a body-scoped layer with enough
  // specificity to remain authoritative for every installed design. The
  // registration/onboarding colour choice must win over package defaults.
  const authoritativeBody = [...unique.entries()]
    .map(([k, v]) => `  --${k}: ${v} !important;`)
    .join("\n");
  const headerPalette = primaryOverride
    ? `\n:root body#storefront-root-font .storefront-header {\n  --header-primary: var(--tenant-brand-primary) !important;\n  --header-secondary: var(--tenant-brand-secondary) !important;\n  --header-soft: var(--tenant-brand-soft) !important;\n}`
    : "";
  const storefrontCanvas = primaryOverride
    ? "\n  background-color: var(--tenant-brand-background) !important;\n  color: var(--tenant-brand-ink) !important;"
    : "";
  return `:root {\n${body}\n}\n:root body#storefront-root-font {\n${authoritativeBody}${storefrontCanvas}\n}${headerPalette}`;
}
