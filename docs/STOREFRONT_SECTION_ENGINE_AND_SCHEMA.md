# Storefront, section engine, and Phase‑1 schema (reference)

This document captures the **target architecture** for `tenant-apps/storefront-web`, the **section-based theme engine**, and a **Phase‑1 database picture**. It also maps everything to the **current** `saas-platform` backend (single PostgreSQL, `tenant_id` isolation) so backend and storefront stay aligned.

---

## 1. Storefront placement and stack

| Item | Choice |
|------|--------|
| App path | `tenant-apps/storefront-web/` |
| **Recommended stack (storefront only)** | **Next.js** (App Router) **15** or **14** + **TypeScript** + **Tailwind CSS** + **lucide-react** |
| Data / forms | **TanStack Query** + **React Hook Form** + **Zod** |
| UI kit (optional) | **shadcn/ui** (Radix-based) |
| Themes | `jewellery`, `electronics`, `textile` — **engine** `engine/` + `registry/resolveSection.tsx` + `sections/*`; shells from `theme-loader/uploaded/` (synced from backend storage); sample JSON under `public/themes/<key>/`. |
| Extensibility | New storefront key = registry entries + optional `public/themes/<key>/` JSON + backend `theme.json`; shared sections stay in `sections/*`. |

**Why Next.js for this app (not Vite SPA):** customer-facing B2B storefront needs **SEO** (indexed PLP/PDP), **shareable URLs**, and **metadata per tenant/product**. Next **App Router** gives `generateMetadata`, SSR/SSG, and route-level loading — Vite+CSR is weaker for organic search unless you add a separate prerender layer.

**Admin / distributor panels** can stay **Vite + React** (internal tools; SEO less critical).

**API base (actual backend today):** `https://<api-host>/api/v1` — not `/api/tenant/...`. Tenant is resolved by **Host** (`tenant_domains` / subdomain), **`X-Tenant-Id`**, or **JWT** (`tenantId` on user). Storefront **public** catalogue may need dedicated `@Public()` routes (to be added when you wire APIs).

### 1.1 SEO checklist (build into storefront from day one)

| Area | Practice |
|------|-----------|
| **Metadata** | `export async function generateMetadata()` on **home**, **category**, **product** routes — `title`, `description`, `openGraph`, `twitter`, `robots` where needed |
| **Canonical** | `alternates.canonical` — especially if same product reachable via multiple paths |
| **URLs** | Readable slugs: `/products/[slug]`, `/categories/[slug]` — align with backend `slug` fields when APIs exist |
| **Sitemap** | `app/sitemap.ts` (or tenant-aware route) — list categories + products from API or incremental static paths |
| **Robots** | `app/robots.ts` — disallow staging; allow production tenant hosts |
| **i18n (later)** | App Router `[locale]` segment + `hreflang` in metadata |
| **Images** | `next/image` — sizes + priority for LCP hero; tenant CDN URLs from branding |
| **Performance** | Streaming `loading.tsx`, font `next/font`, avoid huge client bundles for above-the-fold |

### 1.2 Env (Next storefront)

- `NEXT_PUBLIC_API_URL` — full API prefix including `/api/v1` (e.g. `http://localhost:3000/api/v1`)
- **Theme is not configured in `.env`:** distributor wizard persists selection in **DB** (`tenant_theme_settings` / `tenant_themes` / `themes`); storefront reads **`GET /api/v1/themes/storefront/current`** (public), forwarding browser host via **`X-Storefront-Host`** on SSR fetches. Resolved key is one of **`jewellery` \| `electronics` \| `textile`** (see `theme_config_json.storefrontKey` on web themes). Sample home layouts live under **`storefront-web/public/themes/<key>/`** (`theme.json` + `templates/home.json`); **`?theme=`** preview works in dev (or set **`NEXT_PUBLIC_THEME_QUERY=1`**). Header/Hero/Footer shells sync from **`backend/storage/themes/web/**`** into **`theme-loader/uploaded/`** at build (`npm run themes:sync`).
- Server-side fetch can use internal `API_URL` without `NEXT_PUBLIC_` when calling backend from Docker network

**Folder note (Next):** use `app/`, `components/`, `lib/`, `themes/`, `theme-loader/` at project root of `storefront-web/` (Next convention), not necessarily `src/pages` from the old Vite prompt.

### 1.3 Stack split (SEO vs internal tools)

| Surface | Stack | SEO need |
|---------|--------|----------|
| Super Admin | React + Vite (`admin/`) | Low |
| Distributor panel | React + Vite (`tenant-apps/distributor-panel/`) | Low |
| **Storefront (customer B2B)** | **Next.js App Router** | **High** — SSR/SSG + metadata + sitemap |
| Mobile (optional) | Flutter / native | App store / deep links |

**Rule of thumb:** SPA (Vite CSR) storefront ≈ limited indexing without extra prerender; **Next storefront** ≈ industry default for **Google + share previews**.

### 1.4 SEO-critical routes (must be SSR/SSG-friendly)

Priority for indexing and Core Web Vitals:

1. **`/`** — home  
2. **`/category/[slug]`** — category PLP  
3. **`/products/[slug]`** — product PDP  

Use **slug URLs**, avoid primary navigation to **`/product?id=123`** (use redirects if legacy).

---

## 2. Theme engine vs section engine

### 2.1 Theme engine (v1)

- Each **theme** supplies: `Header`, `Hero`, `Footer` (synced from `backend/storage/themes/web/**` → `theme-loader/uploaded/` via `npm run themes:sync`).
- `getTheme(tenantThemeKey)` in `theme-loader/getThemeRuntime.ts` returns that shell set.
- **Home layout:** `public/themes/<key>/theme.json` + `templates/home.json` (sample) or API `manifestPath`; **`TemplateRenderer`** + **`registry/resolveSection.tsx`** map section ids → shared `sections/*` components.
- **Tenant theme** today: DB `themes` + `tenant_theme_settings` / `tenant_themes`; storefront key `jewellery` \| `electronics` \| `textile` via `GET /themes/storefront/current`.

### 2.2 Section engine (Shopify-style, v2)

- A **page** (e.g. `home`) = ordered list of **sections**.
- Each section: `section_type` + `position` + `config_json`.
- Frontend: `registry/resolveSection.tsx` maps section `id` → React component; templates list section order only.
- **Distributor panel**: homepage builder (add / remove / reorder sections); later drag‑drop.

**Recommended v1 scope:** implement **fixed theme** + **hardcoded default section order** in code, then add **`page_sections`** table + `GET .../storefront/page-sections?page=home` when ready.

---

## 3. Section registry (conceptual)

| `section_type` | Component (example) |
|----------------|---------------------|
| `hero_banner` | `HeroBanner` |
| `category_grid` | `CategoryGrid` |
| `featured_products` | `FeaturedProducts` |
| `promo_banner` | `PromoBanner` |
| `newsletter` | `Newsletter` (later) |

**Future:** `registry/resolveSection.tsx` stays the extension point for new section ids; DB-driven `page_sections` can mirror those ids.

---

## 4. New table: `page_sections` (not in codebase until you add a migration)

PostgreSQL-style definition (align names with existing snake_case migrations):

```sql
CREATE TABLE page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page varchar(64) NOT NULL,           -- e.g. 'home', 'category'
  section_type varchar(64) NOT NULL,   -- e.g. 'featured_products'
  position int NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_sections_tenant_page ON page_sections (tenant_id, page, position);
```

**Example API (future):** `GET /api/v1/storefront/page-sections?page=home` — returns ordered sections for resolved tenant (middleware / JWT).

---

## 5. Phase‑1 conceptual schema (multi‑DB story vs this repo)

The “Deepak bhai” blueprint often shows **one DB per tenant** (`tenant_101_db`). **This monorepo today** uses **one PostgreSQL database** with **`tenant_id`** (and related tables) — do **not** assume per‑tenant DBs unless you explicitly migrate to that model.

Below: **logical** entities grouped by domain. Many already exist as TypeORM entities under `backend/src/common/entities/`.

### 5.1 Platform / SaaS (mostly already present)

| Concept | Notes / existing entities |
|---------|-----------------------------|
| Tenants | `tenants`, `Tenant` |
| Plans / subscriptions | `plans`, `subscriptions`, SaaS `payments` |
| Global catalog helpers | `categories`, `attributes`, industries, etc. |
| Domains | `tenant_domains` / `TenantDomain` |
| Themes | `themes` (`Theme`), `tenant_themes` (`TenantTheme`) |
| Audit | `audit_logs` |

### 5.2 Tenant commerce (mostly already present — same DB)

| Concept | Existing (examples) |
|---------|----------------------|
| Users (staff) | `users` (`User`, roles OWNER/MANAGER/STAFF/CUSTOMER) |
| Products | `products`, `product_variants`, `product_images`, `inventory` |
| Cart | `cart`, `cart_items` |
| Orders | `orders`, `order_items`, `order_payments`, `invoices` |
| Referrals / notifications | `referral_*`, `notifications`, etc. |

### 5.3 Blueprint-only (not fully modeled in backend yet)

| Concept | When you need it |
|---------|------------------|
| `customers` (B2B accounts separate from `users`) | If retailers/dealers are not `User` rows |
| `price_lists` / `customer_prices` | B2B price lists |
| `warehouses` / extended `stock_levels` | If you outgrow current `inventory` |
| `page_sections` | Section engine + homepage builder |
| `page_views` | Analytics |
| `coupons` (order-level distributor coupons) | May overlap with future modules — keep one source of truth |

---

## 6. Complete storefront page map (~30+ routes)

Implement in **waves** (MVP → B2B → polish). Route examples use **App Router** file paths.

### 6.1 Public / marketing

| URL | Purpose |
|-----|---------|
| `/` | Home (sections + theme) |
| `/about` | About us |
| `/contact` | Contact |
| `/privacy-policy` | Privacy |
| `/terms` | Terms & conditions |

### 6.2 Catalog & search (SEO-heavy)

| URL | Purpose |
|-----|---------|
| `/category` | All categories hub (optional) |
| `/category/[slug]` | Category listing (PLP) — **`generateMetadata`** |
| `/products` | All products / browse (optional) |
| `/products/[slug]` | Product detail (PDP) — **`generateMetadata` + JSON-LD** |
| `/search` | Search results e.g. `?q=` |

### 6.3 Cart & checkout

| URL | Purpose |
|-----|---------|
| `/cart` | Cart lines, qty, remove |
| `/checkout` | Address + summary + place order (often client-heavy; still use RSC shell where possible) |
| `/order-success` | Thank-you / order ref |

### 6.4 Auth (map to real backend: OTP / Firebase / etc.)

| URL | Purpose |
|-----|---------|
| `/login` | Customer login |
| `/register` | Customer registration (if product needs it) |

### 6.5 Customer account (post-login)

| URL | Purpose |
|-----|---------|
| `/account` | Dashboard |
| `/account/orders` | Order list |
| `/account/orders/[orderId]` | Order detail |
| `/account/profile` | Profile |
| `/account/addresses` | Address book |

### 6.6 B2B-specific (when product supports it)

| URL | Purpose |
|-----|---------|
| `/account/credit` | Credit limit / used / available |
| `/pricing` | Customer-specific or tier pricing (may be gated) |

### 6.7 Promotions

| URL | Purpose |
|-----|---------|
| `/offers` | Promotions hub |
| `/coupons` | Applicable coupons (if separate from checkout) |

### 6.8 SEO system routes

| URL | Purpose |
|-----|---------|
| `app/sitemap.ts` | Dynamic sitemap (products + categories + static pages) |
| `app/robots.ts` | `robots.txt` rules (staging `Disallow: /`) |

### 6.9 Homepage sections (composable)

Typical home blocks (theme styles them; section engine can order from DB later):

- Hero banner  
- Category grid  
- Featured products  
- Promo banner  
- Latest products  
- Newsletter (later)  

### 6.10 Structured data (Google rich results)

- **`lib/seo.ts`** (or per-route): build **JSON-LD** `Product` / `Offer` / `BreadcrumbList` from PDP payload.  
- Inject in PDP via `<script type="application/ld+json">` in layout or page.  
- Keep **priceCurrency** (e.g. `INR`) and **availability** in sync with backend.

### 6.11 Multi-language (when enabled)

- Routes under **`app/[locale]/...`** (e.g. `/en/products/...`, `/hi/products/...`).  
- Metadata: **`alternates.languages`** / `hreflang` for same entity across locales.

---

## 7. Cursor prompt (short version — use when you generate `storefront-web`)

Use this when you scaffold **`tenant-apps/storefront-web`** with **Next.js App Router** (not Vite):

> Build **Next.js** (App Router) + **TypeScript** + **Tailwind** + **lucide-react** multi-tenant **B2B storefront** under `tenant-apps/storefront-web`. Implement **§6 page map** (at least public + catalog + cart + checkout + auth shell + account shell + sitemap + robots). **SEO:** `generateMetadata` on **home, `/category/[slug]`, `/products/[slug]`**; **`app/sitemap.ts`** + **`app/robots.ts`**; **`next/image`** with meaningful `alt`; **canonical** URLs; **JSON-LD** `Product`/`Offer` on PDP via `lib/seo.ts`. **Theme engine:** `engine/` (`TemplateRenderer`, `SectionRenderer`, JSON loaders) + `registry/resolveSection.tsx` + `sections/*` + `public/themes/{jewellery,electronics,textile}/` sample manifests + `theme-loader/getThemeRuntime.ts` (shells synced from backend storage). **Core:** `ProductCard`, `CategoryCard`, `CartItem`. **API:** `NEXT_PUBLIC_API_URL` = **`/api/v1`**; tenant via **Host** / middleware (no `/api/tenant/*`). **Forms:** TanStack Query + RHF + Zod for checkout. Optional **`[locale]`** segment stub for future hreflang.

---

## 8. Deployment reminder (from your notes)

- `api.*` → backend  
- `admin.*` / distributor host → `tenant-apps/distributor-panel`  
- Custom domain / `*.store.*` → `storefront-web`  
- Nginx TLS, Docker services, Redis for queues — same as generic SaaS deploy.

---

## 9. Suggested order of work

1. Scaffold `storefront-web` (**Next.js App Router**) + theme engine + three sample storefront keys + core cards + **SEO primitives** (metadata + sitemap + robots).  
2. Backend: optional **`page_sections`** migration + **public** storefront read APIs if guests browse without JWT.  
3. Distributor panel: theme picker (already tied to `tenant_themes` / themes) + later homepage section editor.  
4. Section marketplace / drag‑drop — much later.

This file is the **single reference** for schema + storefront + section engine until you split docs further.

---

## 10. Storefront folder state

**`tenant-apps/storefront-web/`** is a **Next.js 15 App Router** app (`create-next-app` + custom theme engine, sections, routes from §6, `sitemap.ts` / `robots.ts`, JSON-LD on PDP). Run `npm install` / `npm run dev` inside that folder (dev port **5175**). Copy `.env.example` → `.env.local` and set `NEXT_PUBLIC_SITE_URL` for correct canonicals in dev.
