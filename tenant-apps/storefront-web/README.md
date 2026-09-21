# Storefront web (theme engine)

Next.js **theme engine**: `theme.json` + JSON templates under `public/themes/{jewellery|electronics|textile}/` (or CDN `/storage/...`), resolved via `GET /api/v1/themes/storefront/current`.

## Layout

- `app/` — routes: home, `category/`, `product/`, `cart/`, `checkout/`
- `engine/` — `theme-loader.ts`, `template-loader.ts`, `template-renderer.tsx`, `section-renderer.tsx`
- `registry/sectionRegistry.ts` — maps template section `id` → React section
- `sections/` — registry UI blocks (themes do **not** ship TSX)
- `components/` — small primitives (`ProductCard`, `CategoryCard`, `Button`, …)
- `services/` — API clients (`productService`, `categoryService`, `cartService`)
- `styles/global.css` — Tailwind entry

## Dev

```bash
npm run dev
# http://localhost:5175 — set NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SITE_URL in .env.local
```

Optional preview: `?theme=textile` (dev or `NEXT_PUBLIC_THEME_QUERY=1`).

## Architecture (multi-tenant + scale)

Full diagram, API map, CDN/caching notes, and mobile parity: [docs/storefront-architecture.md](../../docs/storefront-architecture.md).

**Folder note:** the theme runtime lives under **`engine/`** (not `theme-engine/`); behaviour matches the “theme engine” described in product docs.
