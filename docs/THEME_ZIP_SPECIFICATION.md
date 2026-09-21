# Theme ZIP specification (v1)

**Step-by-step “theme kaise banayein” (folder tree, `theme.json`, templates, upload):** see [`THEME_AUTHORING_GUIDE.md`](./THEME_AUTHORING_GUIDE.md).

This document describes the **admin-uploadable theme package** validated by the backend (`readAndValidateThemeManifest`, `validateThemeTemplateFiles` for WEB, and `validateThemeZipPackage`). It is the contract for theme designers and tooling.

## Goals

- Safe uploads: invalid manifests, templates, or preset shapes must not reach production storage without review.
- Versioned themes: `theme.json` carries `version`; DB row carries `themeVersion`.
- Extensibility: optional folders (`sections/`, `blocks/`, `presets/`) merge with platform defaults at runtime where supported.

## Archive rules

- Format: **ZIP** only (`.zip`).
- Entry paths must stay under the extract root (no `..` segments); enforced at upload.
- **Forbidden:** TypeScript / JSX source inside the theme tree (`.ts`, `.tsx`, `.jsx`, `.mts`, `.cts`). Ship compiled assets and JSON only.

## Root layout (target)

After extraction and single-root flattening:

| Path | Required | Purpose |
|------|----------|---------|
| `theme.json` | **Yes** | Manifest (see below). |
| `templates/` | WEB: per manifest | JSON templates referenced by `theme.json.templates`. |
| `assets/` | No | CSS, images, fonts; paths referenced from templates or `theme.json.assets`. |
| `sections/` | No | Optional `*.schema.json` overrides / extensions. |
| `blocks/` | No | Optional `*.schema.json` for block contracts. |
| `presets/` | No | Optional `*.json` preset files (see Presets). |

macOS `__MACOSX` and similar junk are stripped during upload.

## `theme.json` manifest

Minimum expectations are enforced by `readAndValidateThemeManifest` (Zod). Common fields:

- **`version`**: Contract version string (e.g. `2`).
- **`name`**: Human-readable theme name (optional but recommended).
- **`templates`**: Map of logical page keys to **relative** JSON paths under the ZIP root (WEB themes).
- **`storefrontKey`**: Optional storefront industry key (normalized slug).
- **`allowedSections` / `allowed_sections`**: Section types this theme advertises to the builder.
- **`capabilities`**: Nested object; supported keys include:
  - `allowedSections` / `allowed_sections`
  - `allowedBlocks` / `allowed_blocks`
  - **`variants`**: `Record<sectionType, variantId[]>` — variant ids allowed per section in builders; should align with optional `sections/<type>.<variant>.schema.json` when used.

Unknown `capabilities` keys are preserved for forward compatibility.

## Templates (WEB)

Each template JSON file:

- Must be valid JSON with a root object.
- Section entries reference a **`type`** (and optional **`variant`**) that the storefront registry understands; unknown types may render as stubs but should be listed honestly in `allowedSections` / capabilities.

Cross-checks (paths exist, JSON parseable, section `type` presence) are performed in `validateThemeTemplateFiles`.

## Presets (`presets/*.json`)

Shape matches storefront `SectionPresetsFile` / Zod (`preset-schema.zod.ts`):

```json
{
  "section": "hero-banner",
  "presets": [
    {
      "id": "luxury",
      "label": "Luxury Hero",
      "variant": "center",
      "settings": { "title": "Hello" }
    }
  ]
}
```

Rules:

- Root: object with required string **`section`** and array **`presets`**.
- Each preset: required **`id`**, **`label`**; optional **`variant`**, **`settings`** (object if present).
- Validator warns (does not hard-fail) when `section` or schema `name` is outside the **backend platform registry** (`isKnownRegistrySectionType`), so custom experiments are possible but visible.

## Optional schemas

- **`sections/*.schema.json`** and **`blocks/*.schema.json`**: JSON object root; must include string **`name`**. Other keys follow the storefront schema merge rules.
- File naming conventions for variants may follow `sections/<type>.<variant>.schema.json` as implemented on the storefront.

## Assets

- No strict file list in v1; references in JSON should resolve to paths under the extracted theme.
- Prefer relative paths from the theme root for portability.

## Validation result model

Upload pipeline:

1. Extract + flatten + junk cleanup.
2. `readAndValidateThemeManifest`.
3. WEB: `validateThemeTemplateFiles`.
4. `validateThemeZipPackage` — aggregated **`errors`** (block save) and **`warnings`** (saved on `themeConfigJson.zipValidationWarnings` and returned in API `meta.zipValidationWarnings`).

## Versioning

- **`theme.json.version`**: Manifest / template contract.
- **Theme row `themeVersion`**: Operator-facing semver or label at upload time.

Future work (not in v1 ZIP validation): HTTP merge of ZIP presets into storefront registry, distributor theme install API, CDN publish pipeline.
