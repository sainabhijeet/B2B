/**
 * Theme capability manifest — which section (and later block) types a theme declares support for.
 * When `allowedSections` is set, builders should filter the global registry to this list.
 */

/** Normalize section type keys for comparison (lowercase, trim). */
export function normalizeSectionCapabilityKey(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Reads section allow-list from theme.json: root `allowedSections` / `allowed_sections` and
 * `capabilities.allowedSections` / `capabilities.allowed_sections` (merged, deduped).
 * @returns deduped lowercase list, or `null` if unset / empty → treat as “no restriction” for editors.
 */
export function readAllowedSectionTypes(manifest: Record<string, unknown> | null | undefined): string[] | null {
  if (!manifest || typeof manifest !== "object") return null;
  const seeds: string[] = [];
  const push = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      if (typeof x === "string" && x.trim()) seeds.push(x.trim());
    }
  };
  push(manifest.allowedSections);
  push(manifest.allowed_sections);
  const cap = manifest.capabilities;
  if (cap && typeof cap === "object" && !Array.isArray(cap)) {
    const c = cap as Record<string, unknown>;
    push(c.allowedSections);
    push(c.allowed_sections);
  }
  if (!seeds.length) return null;
  const out = new Set<string>();
  for (const x of seeds) {
    const k = normalizeSectionCapabilityKey(x);
    if (k) out.add(k);
  }
  return out.size ? [...out].sort() : null;
}

export function allowedSectionTypesAsSet(manifest: Record<string, unknown> | null | undefined): Set<string> | null {
  const list = readAllowedSectionTypes(manifest);
  if (!list) return null;
  return new Set(list);
}

/** If manifest has no allow-list, every section type is considered in-scope for the editor. */
export function isSectionTypeAllowedForTheme(
  manifest: Record<string, unknown> | null | undefined,
  sectionType: string,
): boolean {
  const set = allowedSectionTypesAsSet(manifest);
  if (!set) return true;
  return set.has(normalizeSectionCapabilityKey(sectionType));
}

function readCapabilitiesObject(manifest: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  const cap = manifest?.capabilities;
  if (!cap || typeof cap !== "object" || Array.isArray(cap)) return null;
  return cap as Record<string, unknown>;
}

/**
 * `theme.json` → `capabilities.variants` → `{ "hero-banner": ["center","split"] }`.
 * `null` = no restriction; empty array would mean no variants (rare).
 */
export function readAllowedVariantsForSection(
  manifest: Record<string, unknown> | null | undefined,
  sectionType: string,
): string[] | null {
  const c = readCapabilitiesObject(manifest);
  if (!c) return null;
  const raw = c.variants;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const key = normalizeSectionCapabilityKey(sectionType);
  const list = (raw as Record<string, unknown>)[key];
  if (!Array.isArray(list)) return null;
  const out: string[] = [];
  for (const x of list) {
    if (typeof x === "string" && x.trim()) out.push(x.trim().toLowerCase());
  }
  return out.length ? [...new Set(out)] : null;
}

/** Intersect schema-defined variants with theme manifest caps (case-insensitive). */
export function filterVariantsForTheme(
  manifest: Record<string, unknown> | null | undefined,
  sectionType: string,
  variantIds: readonly string[],
): string[] {
  const allowed = readAllowedVariantsForSection(manifest, sectionType);
  if (!allowed?.length) return [...variantIds];
  const set = new Set(allowed.map((x) => x.toLowerCase()));
  return variantIds.filter((v) => set.has(v.trim().toLowerCase()));
}
