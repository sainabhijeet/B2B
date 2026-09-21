import { BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type ThemeTokenRefs = {
  colors?: string;
  typography?: string;
  spacing?: string;
  layout?: string;
  radius?: string;
  shadows?: string;
  breakpoints?: string;
};

type ThemeAssetRefs = {
  css?: string;
};

type ComponentContract = {
  variants?: string[];
  defaultVariant?: string;
  settings?: Record<string, unknown>;
};

/** Theme contract v1/v2 manifest. v2 adds `tokens`, `components`, `assets.css`. */
export type ThemeManifestV1 = {
  version: string;
  name?: string;
  templates?: Record<string, string>;
  sections?: string[];
  /** Optional storefront industry/theme key (dynamic), e.g. jewellery, electronics, textile, theme1 */
  storefrontKey?: string;
  /** Split token file paths, or Model B single bundle e.g. `tokens.json`. */
  tokens?: ThemeTokenRefs | string;
  assets?: ThemeAssetRefs;
  components?: Record<string, string>;
  /** Section `type` values this theme supports — editors filter to this list; optional ZIP validation. */
  allowedSections?: string[];
  /** Snake_case alias for `allowedSections` (readers should accept both). */
  allowed_sections?: string[];
  /** Nested capability lists (merged into `allowedSections` during ZIP validation). */
  capabilities?: {
    allowedSections?: string[];
    allowed_sections?: string[];
    allowedBlocks?: string[];
    allowed_blocks?: string[];
    /** Per-section allowed variant ids for builders, e.g. `{ "hero-banner": ["center","split"] }`. */
    variants?: Record<string, string[]>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function isV2(manifest: ThemeManifestV1): boolean {
  const major = Number.parseInt(
    String(manifest.version ?? '1').split('.')[0] ?? '1',
    10,
  );
  return Number.isFinite(major) && major >= 2;
}

const ALLOWED_SECTION_TYPES = new Set<string>([
  // Header
  'header-basic',
  'header-mega-menu',
  'header-search-focus',
  'header-minimal',
  // Hero
  'hero-banner',
  'hero-split',
  'hero-slider',
  'hero-video',
  'hero-overlay',
  // Category
  'category-grid',
  'category-carousel',
  'category-feature',
  'category-tiles',
  'category-banner',
  'filter-sidebar',
  'pagination',
  // Product
  'product-grid',
  'product-carousel',
  'product-featured',
  'product-showcase',
  'product-comparison',
  'product-tabs',
  'product-variants',
  'product-detail',
  'product-specifications',
  'related-products',
  // Collection/Catalog
  'collection-grid',
  'collection-highlight',
  'collection-editorial',
  'collection-slider',
  // Brand/Trust
  'brand-strip',
  'feature-list',
  'feature-grid',
  'trust-badges',
  // Marketing
  'promo-banner',
  'cta-banner',
  'newsletter',
  'countdown-offer',
  'coupon-banner',
  // Content
  'editorial-grid',
  'image-text',
  'image-gallery',
  'lookbook',
  'instagram-feed',
  'video-block',
  // Social proof
  'testimonial-carousel',
  'testimonial-grid',
  'review-summary',
  'customer-logos',
  // Footer
  'footer-basic',
  'footer-columns',
  'footer-mega',
  'footer-minimal',
  // Backward compatibility / legacy aliases still seen in older theme zips
  'header',
  'hero',
  'category',
  'product',
  'footer',
  'featured-product',
  'collection-showcase',
  'trusted-by',
  'testimonial',
  'blog-grid',
  'gallery',
]);

/** Platform registry of section `type` / `id` strings accepted in v2 theme templates (ZIP validator + upload). */
export function isKnownRegistrySectionType(sectionType: string): boolean {
  return ALLOWED_SECTION_TYPES.has(
    String(sectionType ?? '')
      .trim()
      .toLowerCase(),
  );
}

/** Collect section allow-list seeds from root + nested `capabilities` (before dedupe). */
export function collectAllowedSectionCapabilitySeeds(
  m: Record<string, unknown>,
): string[] {
  const out: string[] = [];
  const push = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      if (typeof x === 'string' && x.trim()) out.push(x.trim());
    }
  };
  push(m.allowedSections);
  push(m.allowed_sections);
  const cap = m.capabilities;
  if (cap && typeof cap === 'object' && !Array.isArray(cap)) {
    const c = cap as Record<string, unknown>;
    push(c.allowedSections);
    push(c.allowed_sections);
  }
  return out;
}

export function mergeCapabilityAllowedSections(
  manifest: Record<string, unknown> | null | undefined,
): string[] {
  if (!manifest || typeof manifest !== 'object') return [];
  const merged = collectAllowedSectionCapabilitySeeds(manifest);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const x of merged) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(x);
  }
  return deduped;
}

/**
 * Best-effort read for runtime (website builder / previews). Invalid entries are ignored.
 * @returns `null` when unset or empty → editors treat as “no restriction”.
 */
export function extractAllowedSectionsFromManifestJson(
  manifest: Record<string, unknown> | null,
): string[] | null {
  const merged = mergeCapabilityAllowedSections(manifest);
  return merged.length ? merged : null;
}

export function extractAllowedBlocksFromManifestJson(
  manifest: Record<string, unknown> | null,
): string[] | null {
  const cap = manifest?.capabilities;
  if (!cap || typeof cap !== 'object' || Array.isArray(cap)) return null;
  const c = cap as Record<string, unknown>;
  const seeds: string[] = [];
  for (const arr of [c.allowedBlocks, c.allowed_blocks]) {
    if (!Array.isArray(arr)) continue;
    for (const x of arr) {
      if (typeof x === 'string' && x.trim()) seeds.push(x.trim());
    }
  }
  if (!seeds.length) return null;
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const x of seeds) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(x);
  }
  return deduped;
}

/** Normalized `capabilities.variants` for builders / manifest cache (section key → variant ids). */
export function extractCapabilitiesVariantsFromManifest(
  manifest: Record<string, unknown> | null | undefined,
): Record<string, string[]> {
  if (!manifest || typeof manifest !== 'object') return {};
  const cap = manifest.capabilities;
  if (!cap || typeof cap !== 'object' || Array.isArray(cap)) return {};
  const v = (cap as Record<string, unknown>).variants;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, arr] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(arr)) continue;
    const list = arr
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim());
    if (list.length) out[k.trim().toLowerCase()] = list;
  }
  return out;
}

async function readJsonFile(
  fullPath: string,
  label: string,
): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await fs.readFile(fullPath, 'utf8');
  } catch {
    throw new BadRequestException(`Missing ${label} file: ${fullPath}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new BadRequestException(`${label} must be valid JSON: ${fullPath}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException(
      `${label} must be a JSON object: ${fullPath}`,
    );
  }
  return parsed as Record<string, unknown>;
}

function assertRelativeThemePath(relPath: string, label: string): void {
  if (!relPath.trim()) {
    throw new BadRequestException(`${label} path must be non-empty.`);
  }
  if (relPath.includes('..')) {
    throw new BadRequestException(
      `${label} path cannot include "..": ${relPath}`,
    );
  }
}

async function validateManifestV2Artifacts(
  extractTo: string,
  manifest: ThemeManifestV1,
): Promise<void> {
  if (!isV2(manifest)) return;

  const tokens = manifest.tokens;
  if (typeof tokens === 'string') {
    const rel = tokens.trim();
    assertRelativeThemePath(rel, 'tokens');
    await readJsonFile(path.join(extractTo, rel), 'tokens');
  } else {
    if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) {
      throw new BadRequestException(
        'theme.json v2 must include "tokens" as an object of file paths or a string path to tokens.json.',
      );
    }
    const requiredTokenKeys: Array<keyof ThemeTokenRefs> = [
      'colors',
      'typography',
      'spacing',
      'layout',
    ];
    for (const key of requiredTokenKeys) {
      const rel = tokens[key];
      if (typeof rel !== 'string') {
        throw new BadRequestException(
          `theme.json v2 tokens.${key} must be a string path.`,
        );
      }
      assertRelativeThemePath(rel, `tokens.${key}`);
      const full = path.join(extractTo, rel);
      await readJsonFile(full, `tokens.${key}`);
    }
    const optionalTokenKeys: Array<keyof ThemeTokenRefs> = [
      'radius',
      'shadows',
      'breakpoints',
    ];
    for (const key of optionalTokenKeys) {
      const rel = tokens[key];
      if (rel === undefined) continue;
      if (typeof rel !== 'string') {
        throw new BadRequestException(
          `theme.json v2 tokens.${key} must be a string path when present.`,
        );
      }
      assertRelativeThemePath(rel, `tokens.${key}`);
      await readJsonFile(path.join(extractTo, rel), `tokens.${key}`);
    }
  }

  const templates = manifest.templates;
  const requiredTemplateKeys = ['home', 'category', 'product'] as const;
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) {
    throw new BadRequestException(
      'theme.json v2 must include "templates" object.',
    );
  }
  for (const key of requiredTemplateKeys) {
    const rel = templates[key];
    if (typeof rel !== 'string' || !rel.trim()) {
      throw new BadRequestException(
        `theme.json v2 templates.${key} must be a string path.`,
      );
    }
  }

  if (manifest.components !== undefined) {
    if (
      typeof manifest.components !== 'object' ||
      manifest.components === null ||
      Array.isArray(manifest.components)
    ) {
      throw new BadRequestException(
        'theme.json "components" must be an object when present.',
      );
    }
    for (const [name, rel] of Object.entries(manifest.components)) {
      if (typeof rel !== 'string') {
        throw new BadRequestException(
          `theme.json components["${name}"] must be a string path.`,
        );
      }
      assertRelativeThemePath(rel, `components.${name}`);
      await readJsonFile(path.join(extractTo, rel), `components.${name}`);
    }
  }

  if (manifest.assets !== undefined) {
    if (
      typeof manifest.assets !== 'object' ||
      manifest.assets === null ||
      Array.isArray(manifest.assets)
    ) {
      throw new BadRequestException(
        'theme.json "assets" must be an object when present.',
      );
    }
    const css = (manifest.assets as ThemeAssetRefs).css;
    if (css !== undefined) {
      if (typeof css !== 'string') {
        throw new BadRequestException(
          'theme.json assets.css must be a string path when present.',
        );
      }
      assertRelativeThemePath(css, 'assets.css');
      const cssPath = path.join(extractTo, css);
      try {
        await fs.readFile(cssPath, 'utf8');
      } catch {
        throw new BadRequestException(`Missing assets.css file: ${cssPath}`);
      }
    }
  }
}

function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function readPrimitiveTypeLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim().toLowerCase();
  if (!['string', 'number', 'boolean', 'image', 'array', 'object'].includes(t))
    return null;
  return t;
}

function matchesType(value: unknown, expected: string): boolean {
  if (expected === 'image') return typeof value === 'string';
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object')
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  return typeof value === expected;
}

async function loadComponentContracts(
  extractTo: string,
  manifest: ThemeManifestV1,
): Promise<Map<string, ComponentContract>> {
  const contracts = new Map<string, ComponentContract>();
  if (
    !isV2(manifest) ||
    !manifest.components ||
    typeof manifest.components !== 'object' ||
    Array.isArray(manifest.components)
  ) {
    return contracts;
  }
  for (const [key, rel] of Object.entries(manifest.components)) {
    if (typeof rel !== 'string' || !rel.trim()) continue;
    const parsed = await readJsonFile(
      path.join(extractTo, rel),
      `components.${key}`,
    );
    const variants = parsed.variants;
    if (variants !== undefined) {
      if (
        !Array.isArray(variants) ||
        !variants.every((v) => typeof v === 'string' && v.trim().length > 0)
      ) {
        throw new BadRequestException(
          `components.${key} "variants" must be a non-empty string array when present.`,
        );
      }
    }
    const defaultVariant = parsed.defaultVariant;
    if (defaultVariant !== undefined && typeof defaultVariant !== 'string') {
      throw new BadRequestException(
        `components.${key} "defaultVariant" must be a string when present.`,
      );
    }
    if (
      typeof defaultVariant === 'string' &&
      Array.isArray(variants) &&
      !variants.includes(defaultVariant)
    ) {
      throw new BadRequestException(
        `components.${key} defaultVariant "${defaultVariant}" is not in variants.`,
      );
    }
    const settings = parsed.settings;
    if (settings !== undefined) {
      if (
        !settings ||
        typeof settings !== 'object' ||
        Array.isArray(settings)
      ) {
        throw new BadRequestException(
          `components.${key} "settings" must be an object when present.`,
        );
      }
      for (const [sKey, sVal] of Object.entries(settings)) {
        if (readPrimitiveTypeLabel(sVal) === null) {
          throw new BadRequestException(
            `components.${key} settings.${sKey} must be one of: string, number, boolean, image, array, object.`,
          );
        }
      }
    }
    contracts.set(normalizeKey(key), {
      variants: Array.isArray(variants) ? variants : undefined,
      defaultVariant:
        typeof defaultVariant === 'string' ? defaultVariant : undefined,
      settings: settings as Record<string, unknown> | undefined,
    });
  }
  return contracts;
}

export async function readAndValidateThemeManifest(
  extractTo: string,
): Promise<ThemeManifestV1> {
  const manifestPath = path.join(extractTo, 'theme.json');
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf8');
  } catch {
    throw new BadRequestException(
      'ZIP must include theme.json at the root (after optional single top-level folder is flattened).',
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new BadRequestException('theme.json must be valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException('theme.json must be a JSON object.');
  }
  const m = parsed as Record<string, unknown>;
  if (typeof m.version !== 'string' || !m.version.trim()) {
    throw new BadRequestException(
      'theme.json must include a non-empty "version" string.',
    );
  }
  if (m.name !== undefined && typeof m.name !== 'string') {
    throw new BadRequestException(
      'theme.json "name" must be a string when present.',
    );
  }
  if (
    m.templates !== undefined &&
    (typeof m.templates !== 'object' ||
      m.templates === null ||
      Array.isArray(m.templates))
  ) {
    throw new BadRequestException(
      'theme.json "templates" must be an object when present.',
    );
  }
  if (m.sections !== undefined) {
    if (
      !Array.isArray(m.sections) ||
      !m.sections.every((x) => typeof x === 'string')
    ) {
      throw new BadRequestException(
        'theme.json "sections" must be an array of strings when present.',
      );
    }
  }
  const validateCapList = (label: string, value: unknown) => {
    if (value === undefined) return;
    if (
      !Array.isArray(value) ||
      !value.every((x) => typeof x === 'string' && String(x).trim().length > 0)
    ) {
      throw new BadRequestException(
        `theme.json "${label}" must be an array of non-empty strings when present.`,
      );
    }
  };
  validateCapList('allowedSections', m.allowedSections);
  validateCapList('allowed_sections', m.allowed_sections);
  if (m.capabilities !== undefined) {
    if (
      typeof m.capabilities !== 'object' ||
      m.capabilities === null ||
      Array.isArray(m.capabilities)
    ) {
      throw new BadRequestException(
        'theme.json "capabilities" must be an object when present.',
      );
    }
    const cap = m.capabilities as Record<string, unknown>;
    validateCapList('capabilities.allowedSections', cap.allowedSections);
    validateCapList('capabilities.allowed_sections', cap.allowed_sections);
    validateCapList('capabilities.allowedBlocks', cap.allowedBlocks);
    validateCapList('capabilities.allowed_blocks', cap.allowed_blocks);
    if (cap.variants !== undefined) {
      if (
        typeof cap.variants !== 'object' ||
        cap.variants === null ||
        Array.isArray(cap.variants)
      ) {
        throw new BadRequestException(
          'theme.json "capabilities.variants" must be an object when present.',
        );
      }
      for (const [secKey, arr] of Object.entries(
        cap.variants as Record<string, unknown>,
      )) {
        if (typeof secKey !== 'string' || !secKey.trim()) {
          throw new BadRequestException(
            'theme.json "capabilities.variants" keys must be non-empty section type strings.',
          );
        }
        validateCapList(`capabilities.variants["${secKey}"]`, arr);
      }
    }
  }
  const mergedAllowed = collectAllowedSectionCapabilitySeeds(m)
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);
  if (mergedAllowed.length) {
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const x of mergedAllowed) {
      const k = x.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(x);
    }
    (m as ThemeManifestV1).allowedSections = deduped;
  }
  if (m.storefrontKey !== undefined && typeof m.storefrontKey !== 'string') {
    throw new BadRequestException(
      'theme.json "storefrontKey" must be a string when present.',
    );
  }
  return m as ThemeManifestV1;
}

/**
 * Validates registry-style template JSON files referenced by theme.json (WEB themes).
 * Theme ZIPs must not ship executable TSX — only JSON templates + assets.
 */
function themeAllowedSectionCapabilitySet(
  manifest: ThemeManifestV1,
): Set<string> | null {
  const list = manifest.allowedSections;
  if (!list?.length) return null;
  return new Set(
    list.map((x) => String(x).trim().toLowerCase()).filter((x) => x.length > 0),
  );
}

export async function validateThemeTemplateFiles(
  extractTo: string,
  manifest: ThemeManifestV1,
): Promise<void> {
  const templates = manifest.templates;
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) {
    throw new BadRequestException(
      'Web theme theme.json must include "templates" (e.g. { "home": "templates/home.json" }).',
    );
  }
  const home = templates['home'];
  if (typeof home !== 'string' || !home.trim()) {
    throw new BadRequestException(
      'theme.json must include templates.home pointing at the home page template JSON.',
    );
  }
  const strictV2 = isV2(manifest);
  const componentContracts = await loadComponentContracts(extractTo, manifest);
  for (const [logicalName, relPath] of Object.entries(templates)) {
    if (typeof relPath !== 'string' || !relPath.trim()) {
      throw new BadRequestException(
        `theme.json templates["${logicalName}"] must be a non-empty string.`,
      );
    }
    if (relPath.includes('..')) {
      throw new BadRequestException(
        `Invalid template path (no ".."): ${relPath}`,
      );
    }
    const fullPath = path.join(extractTo, relPath);
    const resolved = path.resolve(fullPath);
    const base = path.resolve(extractTo);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new BadRequestException(
        `Template path escapes theme directory: ${relPath}`,
      );
    }
    let raw: string;
    try {
      raw = await fs.readFile(fullPath, 'utf8');
    } catch {
      throw new BadRequestException(
        `Missing template file referenced in theme.json: ${relPath}`,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new BadRequestException(
        `Template file must be valid JSON: ${relPath}`,
      );
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException(
        `Template root must be a JSON object: ${relPath}`,
      );
    }
    const sections = (parsed as Record<string, unknown>).sections;
    if (!Array.isArray(sections)) {
      throw new BadRequestException(
        `Template "${relPath}" must include a "sections" array.`,
      );
    }
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec || typeof sec !== 'object' || Array.isArray(sec)) {
        throw new BadRequestException(
          `Template "${relPath}" sections[${i}] must be an object.`,
        );
      }
      const s = sec as Record<string, unknown>;
      const id = s.id;
      const type = s.type;
      if (
        (typeof id !== 'string' || !id.trim()) &&
        (typeof type !== 'string' || !type.trim())
      ) {
        throw new BadRequestException(
          `Template "${relPath}" sections[${i}] must have string "id" or string "type".`,
        );
      }
      const cap = themeAllowedSectionCapabilitySet(manifest);
      if (cap?.size) {
        const rawType =
          typeof type === 'string' && type.trim() ? type.trim() : '';
        const rawId = typeof id === 'string' && id.trim() ? id.trim() : '';
        const sectionKey = (rawType || rawId).toLowerCase();
        if (sectionKey && !cap.has(sectionKey)) {
          throw new BadRequestException(
            `Template "${relPath}" section "${rawType || rawId}" is not listed in theme.json allowedSections / allowed_sections.`,
          );
        }
      }
      if (s.component !== undefined && typeof s.component !== 'string') {
        throw new BadRequestException(
          `Template "${relPath}" sections[${i}] "component" must be a string when present.`,
        );
      }
      if (s.variant !== undefined && typeof s.variant !== 'string') {
        throw new BadRequestException(
          `Template "${relPath}" sections[${i}] "variant" must be a string when present.`,
        );
      }
      if (
        s.settings !== undefined &&
        (typeof s.settings !== 'object' ||
          s.settings === null ||
          Array.isArray(s.settings))
      ) {
        throw new BadRequestException(
          `Template "${relPath}" sections[${i}] "settings" must be an object when present.`,
        );
      }
      if (strictV2) {
        const key = String(type ?? id ?? '')
          .trim()
          .toLowerCase();
        if (!ALLOWED_SECTION_TYPES.has(key)) {
          throw new BadRequestException(
            `Template "${relPath}" sections[${i}] uses unknown section type/id "${key}".`,
          );
        }
        const rawType = String(type ?? id ?? '').trim();
        const rawComponent =
          typeof s.component === 'string' ? s.component.trim() : '';
        const normalizedCandidates = [
          normalizeKey(rawType),
          normalizeKey(rawComponent),
          normalizeKey(rawType.split('-')[0] ?? ''),
        ].filter((x) => x.length > 0);
        const contract = normalizedCandidates
          .map((c) => componentContracts.get(c))
          .find((c): c is ComponentContract => Boolean(c));
        if (contract) {
          const variant =
            typeof s.variant === 'string' && s.variant.trim()
              ? s.variant.trim()
              : contract.defaultVariant;
          if (
            variant &&
            Array.isArray(contract.variants) &&
            !contract.variants.includes(variant)
          ) {
            throw new BadRequestException(
              `Template "${relPath}" sections[${i}] variant "${variant}" is not allowed for "${rawType}".`,
            );
          }
          if (
            contract.settings &&
            s.settings &&
            typeof s.settings === 'object' &&
            !Array.isArray(s.settings)
          ) {
            for (const [sKey, sVal] of Object.entries(s.settings)) {
              const expected = readPrimitiveTypeLabel(contract.settings[sKey]);
              if (!expected) continue;
              if (!matchesType(sVal, expected)) {
                const got = Array.isArray(sVal) ? 'array' : typeof sVal;
                throw new BadRequestException(
                  `Template "${relPath}" sections[${i}] settings.${sKey} expected ${expected}, got ${got}.`,
                );
              }
            }
          }
        }
      }
    }
  }

  await validateManifestV2Artifacts(extractTo, manifest);
}
