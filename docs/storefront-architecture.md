# Storefront architecture (Next.js + multi-tenant + theme engine)

This document maps a **Shopify-style** mental model to **this monorepo**: `tenant-apps/storefront-web` + Nest `api/v1` + per-tenant DB schemas.

## 1. Three frontends, one API

| Surface | Path in repo | Consumes |
|--------|----------------|----------|
| Distributor panel | `admin/` (separate app) | Tenant-scoped + platform APIs with JWT |
| Storefront (web) | `tenant-apps/storefront-web/` | `GET /themes/storefront/current`, `GET /storefront/products`, … |
| Mobile app | (future / external) | **Same** `api/v1` routes + same tenant resolution rules |

## 2. Storefront folder structure (actual vs suggested)

Your spec used `theme-engine/`; this repo uses **`engine/`** (same role).

```
tenant-apps/storefront-web/
├── app/                    # Routes: home, category/[slug], product/[slug], cart, checkout
├── components/             # Small UI primitives
├── sections/               # Registry-backed blocks (themes do not ship TSX)
├── engine/                 # Theme engine: loaders, template renderer, tokens, overrides
├── registry/               # sectionRegistry.ts — template `type` + `variant` → React
├── services/               # productService, categoryService, cartService (wire cart to API when ready)
├── lib/                    # api-origin, storefrontApi, resolve-storefront-theme, theme-config
├── hooks/                  # Client hooks (cart/auth); see hooks/README.md
├── styles/
├── public/themes/          # Synced / fallback theme assets (see scripts/sync-uploaded-themes.mjs)
└── scripts/
```

## 3. Multi-tenant resolution (domain → tenant → theme)

**Browser:** request hits Next with `Host: jewellery.example.com` (or `{slug}.localhost:5175` in dev).

**SSR in Next:** `lib/resolve-storefront-theme.ts` calls:

- `GET {NEXT_PUBLIC_API_URL}/themes/storefront/current`
- Sends **`X-Storefront-Host`** = forwarded `Host` (see `headers()` in that file).

**Nest:** `TenantMiddleware` / tenant resolver uses that header (and mappings) to attach `tenantId`, then `GET themes/storefront/current` returns `storefrontKey`, `webTheme.manifestPath`, `contentOverrides`, `tokenOverrides`, etc.

**Mobile:** must send the **same** tenant identity the backend expects, e.g. `X-Storefront-Host: tenant.customdomain.com` (or your agreed header / future `X-Tenant-Id` if you add it for app-only flows).

**Env:** `.env.example` documents `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` (include `/api/v1`), optional `API_URL` for server-side SSR inside Docker.

## 4. Theme engine (1000+ themes)

**Principles:**

1. **Themes are data**, not React code: `theme.json` + `templates/*.json` + `assets/` under storage (or CDN).
2. **One React registry** (`registry/sectionRegistry.ts`) maps section `type` / `variant` → `sections/*` components.
3. **Runtime chain:** resolve tenant theme → fetch manifest (`manifestPath`) → `engine/template-loader.ts` loads JSON → `engine/template-renderer.tsx` + `section-renderer` mount sections.

**Scaling to many themes:**

| Concern | Approach |
|--------|----------|
| Storage | Themes on disk or object storage; DB holds `storage_path` / `manifest_path` per theme record. |
| CDN | Serve `assets/css`, images from `https://cdn…/storage/themes/...` (Nest already exposes `/storage/`; put Cloudflare in front). |
| SSR cache | `fetch(..., { next: { revalidate: N } })` for public catalog pages where safe; keep `themes/storefront/current` **no-store** or short TTL if overrides change often. |
| Edge | Optional: move manifest + template JSON to edge KV for hot tenants only. |

**Dev override:** `?theme=jewellery` when `NODE_ENV=development` or `NEXT_PUBLIC_THEME_QUERY=1` (`engine/theme-loader.ts` / `resolve-storefront-theme.ts`).

## 5. Template & registry (contract)

Templates are JSON lists of sections, e.g. `{ "sections": [ { "type": "hero", "variant": "banner" }, … ] }` (see `engine/schema/theme-engine.schema` and `engine/theme-loader.ts` defaults).

**Registry:** `registry/sectionRegistry.ts` — `resolveSectionFromRegistry(type, variant)` returns a component. Add a row here when you add a new section kind.

## 6. Page flows

| Page | Route | Data |
|------|--------|------|
| Home | `app/page.tsx` | `resolveStorefrontTheme` → `loadHomeTemplateChain` → `TemplateRenderer` |
| Category | `app/category/[slug]/` | Same theme resolution + category template chain |
| Product | `app/product/[slug]/` | `storefront/products` + detail / variant pricing |
| Cart | `app/cart/` | Today demo data in `services/cartService.ts` — replace with `GET/POST …/cart` + auth cookies/headers |
| Checkout | `app/checkout/` | `POST …/orders` (JWT customer) — align with `backend` orders module |

## 7. Storefront APIs (Nest, global prefix `api/v1`)

Examples (all require tenant context from host / middleware unless noted):

- `GET /themes/storefront/current` — theme + manifest pointers + overrides  
- `GET /storefront/products` — list + filters  
- `GET /storefront/products/:slug` — detail (optional JWT for B2B price)  
- `GET /storefront/categories`  
- `GET/POST /cart`, `POST /orders`, … — JWT session for retailer  

**Pricing:** product detail can include B2B resolved price when `customerId` / auth is wired (see storefront products service).

## 8. Performance checklist

1. **SSR + caching:** ISR/revalidate for product listing where inventory staleness is acceptable.  
2. **Redis:** cache filter facets / list responses in Nest (not required in Next for first phase).  
3. **Images:** Next `Image` + CDN URLs from API.  
4. **Fonts/CSS:** theme CSS via `<style>` or linked CSS from CDN path in manifest.

## 9. “Shopify-level” gaps (honest backlog)

- Wire **`services/cartService.ts`** to real **`/cart`** APIs + auth.  
- **Unified `lib/api-client.ts`** optional wrapper around `getStorefrontApiBase` + headers + zod parsing.  
- **Customer JWT** on storefront (cookies / Authorization) for cart, orders, priced APIs.  
- **Sitemap / robots** per tenant host.  
- **Preview / draft** themes for distributors.

## 10. Summary

The repo already implements the **core loop**: **Host → API tenant resolution → theme manifest → JSON template → section registry → React**. Scaling to **1000+ tenants / themes** is mainly **CDN + storage layout + caching policy**; scaling **concurrent SSR** is **PgBouncer + Next/edge** as in platform docs.

For B2B order flow and tenant-schema DB layout, see [b2b-order-engine-architecture.md](./b2b-order-engine-architecture.md).
