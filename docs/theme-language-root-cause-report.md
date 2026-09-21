# Storefront Language Root-Cause Analysis

## Result

The storefront had two independent language-path defects:

1. `/themes/storefront/current` resolved the language independently from Distributor Settings. A stale or default `tenant_app_settings` value (`en`) could therefore be returned even when the Distributor-facing configuration had another language.
2. The storefront template loader never loaded theme locale JSON files. When a non-English key was absent from the built-in dictionary, `translateText` returned the source string unchanged. That silently reintroduced English into a French or Arabic page.

The fix makes `AppConfigService` the language authority for the public theme payload and loads the selected theme locale from `manifest.locales[language]`, falling back only to the existing built-in dictionary—not silently to English for a missing locale file.

## End-to-end trace

| Boundary | Verification | Result |
|---|---|---|
| Distributor language selection | Distributor Settings sends `selectedLanguageCode` to `PUT /distributor/app-config`. | Correct persistence path. |
| Backend persistence | `AppConfigService.updateForTenant` normalizes and saves `tenant_app_settings.selected_language_code`, invalidating the language cache on change. | Correct; unchanged by this fix. |
| App Config API | `GET /distributor/app-config` uses `AppConfigService.getForTenant`. | Correct. |
| Public theme API | `ThemesService.storefrontCurrent` previously queried settings/onboarding directly. | Root cause: duplicate resolution could return stale `en`. It now calls `AppConfigService`. |
| Storefront resolver | `resolveStorefrontTheme` reads `data.selectedLanguageCode` and normalizes it. | Correct once the public API payload is authoritative. |
| Locale loader | Templates were loaded, but locale JSON was not. | Root cause: locale files were ignored. It now loads the active locale with `cache: no-store`. |
| Theme locale files | No repository-local locale files were found; uploaded themes may provide them through the manifest/storage package. | The loader supports `locales/<code>.json` convention and explicit `manifest.locales` paths. |
| Template renderer | `applyTemplateLanguage` used built-in dictionaries only, and missing keys returned the English source value. | Fixed to merge the loaded theme dictionary into real template rendering. |
| Rendered HTML | `StorefrontLocaleFrame` already sets `lang`/`dir`; content translation depends on the renderer dictionary. | French/Arabic content now has the correct locale source when the package provides it; Arabic direction remains `rtl`. |

## Fallback analysis

The English text was introduced in two places:

- The public theme API could emit `selectedLanguageCode: "en"` because it used a separate settings/onboarding lookup.
- `template-language.ts` deliberately returned the original text when no dictionary entry existed. This was a silent English fallback.

The first path is corrected by using the shared app-config resolver. The second path is corrected for theme-provided translations by loading the active locale file before rendering. Missing translation keys remain reportable through the existing coverage/preview diagnostics and must be resolved by the theme package before publish under the existing publish-blocking policy.

## Locale package contract

Theme packages may declare:

```json
{
  "locales": {
    "fr": "locales/fr.json",
    "ar": "locales/ar.json"
  }
}
```

If a language is not declared, the loader checks `locales/<language>.json`. Locale files must be flat JSON string dictionaries. Asset URLs, identifiers, and structural fields remain excluded from translation.

## Modified files

- `backend/src/modules/themes/themes.service.ts` — public theme API now uses `AppConfigService` as the single language authority.
- `backend/src/modules/themes/themes.module.ts` — imports `AppConfigModule` for the shared resolver.
- `tenant-apps/storefront-web/engine/schema/theme-engine.schema.ts` — adds the optional manifest locale map.
- `tenant-apps/storefront-web/engine/template-loader.ts` — adds active-locale JSON loading with uncached reads.
- `tenant-apps/storefront-web/engine/theme-loader.ts` — passes the loaded locale dictionary to the real renderer.
- `tenant-apps/storefront-web/engine/template-language.ts` — merges external locale dictionaries during recursive template translation.

## Verification

- Backend TypeScript/Nest build: passed.
- Storefront TypeScript compile: passed.
- Backend Jest: 21 suites passed, 33 tests passed.
- Targeted ESLint: existing backend baseline findings remain; no compile regression was introduced. The changed storefront files are type-correct.
- Runtime browser verification: not executable in this environment because no browser process, browser connector, or screenshot capture tool is available. No screenshots are claimed or fabricated.

## Required live acceptance checks

Against a running backend, storefront, and tenant host:

1. Select English; inspect API payload and HTML text for English-only output.
2. Select French; confirm payload `selectedLanguageCode: "fr"`, locale request `locales/fr.json`, `lang="fr"`, and French HTML.
3. Select Arabic; confirm payload `ar`, locale request `locales/ar.json`, `lang="ar"`, `dir="rtl"`, and Arabic HTML.
4. Remove a required locale key; confirm the existing translation report detects it and publish remains blocked.
