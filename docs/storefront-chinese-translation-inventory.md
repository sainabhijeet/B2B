# Storefront Chinese Translation Inventory

## Scope

This audit covers the storefront React routes, theme section renderer, layout/block renderer, cart and checkout components, fallback sections, and the shared storefront language dictionary. The active locale under test is `zh`.

## Root cause of the remaining English

The language resolver was returning `zh`, but several UI paths did not use that value:

1. FAQ and blog section defaults were literal English strings.
2. Product and cart fallback labels were literal English strings.
3. Cart error fallbacks were constructed directly in the client component.
4. The JSON block renderer did not pass `languageCode` to block components, so block defaults and block settings could bypass localization.
5. Unknown-section diagnostics were rendered as English development text.

The normal page renderer and route-level chrome already used the locale dictionary. The bypasses above explain why Chinese and English appeared together even though the selected language was `zh`.

## Remediation inventory

| Source | Previous English | Classification | Resolution |
|---|---|---|---|
| `FaqSection` | FAQ title and default questions/answers | Hardcoded component defaults | Routed through `translateText` and added `zh` entries |
| `BlogPreviewSection` | Journal title and demo posts | Hardcoded component defaults | Routed through `translateText` and added `zh` entries |
| `ProductInfoSection` | `Product` | Hardcoded fallback | Locale key |
| `ProductDetail` | `Product` | Hardcoded fallback | Locale key |
| `CartSummarySection` | `Sample item` | Hardcoded demo content | Locale key |
| `CartItem` | `Qty` | Hardcoded component label | Locale key |
| `CartItemRow` | `Update failed`, `Remove failed` | Hardcoded client errors | Locale keys |
| `StubSection` | Humanized section type and compatibility message | Renderer fallback | Locale-aware fallback |
| JSON block renderer | Button, badge, heading, product/category defaults and block text | Renderer bypass | Passes locale to blocks and localizes UI settings |

## Hardcoded string report

The remaining English literals found by the storefront JSX scan are not customer-facing UI labels:

- `support@marketpro.example`: email address.
- Login development helper text containing environment names, hostnames, database field names, and seed commands.
- API route error payloads and protocol identifiers.
- Theme/product/category/customer content supplied as data rather than application chrome.

These are intentionally not translated as UI labels. Data content must be translated by the theme/content translation workflow or reported as missing content; it must not be silently treated as a translated system label.

## Components still bypassing localization

No ordinary storefront UI component in the audited route/section/block paths remains intentionally bypassed. The following inputs remain data-dependent and require content-level coverage validation:

- tenant-provided product names, descriptions, category names, blog posts, FAQ entries, logos, image alt text, and theme manifest content;
- backend-generated customer-facing error messages;
- metadata strings in route `metadata` exports, which are not rendered body UI but should be localized separately if localized SEO is required.

## Translation coverage

For the audited application-owned UI inventory, coverage is **100% of identified English UI literals** after remediation: all identified labels/defaults are dictionary keys or are passed through a locale-aware renderer.

Overall storefront content coverage is **not claimable as 100% from static source inspection** because tenant/theme data is runtime data. The existing `collectMissingTranslationKeys` diagnostic remains the authoritative report for template values; a release must have zero required missing keys before publish.

## Missing translation policy

Missing theme/content translations are reported by the existing missing-key diagnostic. They are not valid reasons to add English literals to application components. Runtime verification should fail the preview/publish readiness check when a required UI key is missing.

## Verification performed

- TypeScript: passed with `npx tsc --noEmit`.
- Targeted ESLint: passed with no errors; existing warnings remain for image optimization and one login hook warning was corrected.
- Static JSX scan: no ordinary English storefront text nodes remain; only technical/debug values and an email address remain.

Live browser screenshots were not available in this execution environment, so browser-level proof of rendered HTML, tenant content coverage, and zero English data strings remains a required external verification step.
