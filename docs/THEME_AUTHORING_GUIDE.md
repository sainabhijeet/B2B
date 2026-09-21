# Theme kaise banayein — poora structure (WEB storefront)

Yeh guide **admin ZIP upload** wale WEB theme ke liye hai. Storefront JSON templates + assets se render hota hai; section UI **codebase registry** se aata hai (theme ZIP mein `.tsx` mat daalo).

---

## 1) TL;DR checklist

1. Ek root folder banao (ZIP ke andar yahi files honi chahiye — ya ek single top-level folder, backend flatten kar deta hai).
2. **`theme.json`** (required) — `version`, WEB ke liye **`templates`** + kam se kam **`templates.home`**.
3. **`templates/home.json`** (required path manifest se).
4. **`templates/category.json`**, **`templates/product.json`** — recommended (pages use karte hain).
5. **`assets/`** — CSS / images; templates mein relative paths.
6. Optional: **`tokens/`**, **`components/`**, **`presets/`**, **`sections/*.schema.json`**.
7. `.zip` banao → **Admin → Themes → Upload** (Super Admin).
8. **Distributor panel → Storefront theme** se tenant par theme select karo.
9. Storefront: **`{tenant-slug}.localhost:5175`** + `NEXT_PUBLIC_SITE_URL` same origin (dev).

Technical ZIP contract: [`THEME_ZIP_SPECIFICATION.md`](./THEME_ZIP_SPECIFICATION.md).

---

## 2) Poora folder tree (example)

```
my-theme/                          ← ZIP root (ya ZIP ke andar yahi ek folder)
├── theme.json                     ← REQUIRED
├── templates/
│   ├── home.json                  ← REQUIRED (theme.json.templates.home se link)
│   ├── category.json
│   └── product.json
├── assets/
│   ├── css/
│   │   └── theme.css
│   └── images/
│       └── hero.jpg
├── tokens/                        ← optional (v1 / v2 manifest se paths)
│   ├── colors.json
│   ├── typography.json
│   ├── spacing.json
│   └── layout.json
├── components/                    ← optional (v2-style contracts; v1.0 themes bina in ke chal sakte hain)
│   ├── hero.json
│   └── product-grid.json
├── presets/                       ← optional (builder starter rows)
│   └── hero-banner.presets.json
├── sections/                      ← optional
│   └── hero-banner.center.schema.json
└── blocks/                        ← optional
    └── text-block.schema.json
```

---

## 3) `theme.json` — fields (practical)

| Field | Required | Notes |
|--------|----------|--------|
| `version` | **Haan** | String, e.g. `"1.0"` ya `"2.0"`. Major `2` par backend **zyaada strict** v2 checks chala sakta hai (tokens paths, component contracts). Shuruat ke liye **`1.0`** safe. |
| `name` | Recommended | Display name. |
| `storefrontKey` | Optional | Industry / look key, e.g. `jewellery`. Storefront styling class `theme-{key}` jaisi cheezon se jud sakta hai. |
| `templates` | **WEB ke liye haan** | Object: logical key → relative file path. **Minimum:** `"home": "templates/home.json"`. Recommended: `home`, `category`, `product`. |
| `allowedSections` / `allowed_sections` | Recommended | Agar set ho to **templates ke har section `type`** is list mein hona chahiye**, warna WEB upload validation fail. |
| `capabilities` | Optional | `allowed_sections`, `allowed_blocks`, `variants` (per-section variant ids). |
| `tokens` | Optional | Object of paths ya single `"tokens.json"` string (v2). |
| `components` | Optional | v2 component contract JSON paths. |
| `assets` / `styles` | Optional | CSS paths; theme1 sample `styles.main` use karta hai — runtime loader `assets` bhi support karta hai; **consistency** rakho. |

**`capabilities.allowed_sections` example** (template jo types use karein unko include karo):

```json
{
  "version": "1.0",
  "name": "My Jewellery Theme",
  "storefrontKey": "jewellery",
  "capabilities": {
    "allowed_sections": [
      "header",
      "hero-split",
      "category-grid",
      "product-grid",
      "testimonial-carousel",
      "newsletter",
      "editorial-banner",
      "footer-columns",
      "product-detail",
      "product-carousel"
    ]
  },
  "templates": {
    "home": "templates/home.json",
    "category": "templates/category.json",
    "product": "templates/product.json"
  },
  "tokens": {
    "colors": "tokens/colors.json",
    "typography": "tokens/typography.json",
    "spacing": "tokens/spacing.json",
    "layout": "tokens/layout.json"
  },
  "styles": {
    "main": "assets/css/theme.css"
  }
}
```

---

## 4) Page template JSON (`templates/*.json`)

- Root: **`{ "sections": [ ... ] }`**
- Har section: kam se kam **`type`** (ya legacy **`id`**) string.
- **`variant`**, **`settings`**, **`blocks`**, **`columns`** — engine / registry ke hisaab se optional.

**Chhota example `templates/home.json`:**

```json
{
  "sections": [
    {
      "id": "header",
      "type": "header",
      "settings": { "logoText": "My Shop" }
    },
    {
      "id": "hero",
      "type": "hero-split",
      "settings": {
        "title": "Welcome",
        "subtitle": "Tagline"
      }
    },
    {
      "id": "grid",
      "type": "product-grid",
      "settings": {}
    },
    {
      "id": "footer",
      "type": "footer-columns"
    }
  ]
}
```

**Important:** Jo **`type`** tum use karte ho, woh storefront par **registered section** hona chahiye; unknown par stub / generic UI ho sakta hai. Naye types ZIP se add **nahi** hote — unke liye storefront code mein section add karna padta hai.

---

## 5) Section `type` — kahan dekhein (reference)

- Backend upload / validation allow-list: `backend/src/modules/themes/theme-manifest.util.ts` → `ALLOWED_SECTION_TYPES` (roughly platform “catalog”).
- Storefront picker / registry: `tenant-apps/storefront-web/theme-engine/` (schemas, `sectionCatalog`, etc.).

Dono jagah names **sync** rehna behtar hai; mismatch par warnings mil sakti hain.

---

## 6) Assets & paths

- Theme root se **relative** paths prefer karo: `assets/images/hero.jpg`.
- Template `settings` mein image fields — engine unko **manifest URL** ke base par absolute URL bana sakta hai.
- CSS: `assets/css/theme.css` jaise path `theme.json` / loader se jodo.

---

## 7) Optional: `presets/`

- File: `presets/<anything>.json`
- Shape:

```json
{
  "section": "hero-banner",
  "presets": [
    { "id": "default", "label": "Default", "variant": "center", "settings": { "title": "Hi" } }
  ]
}
```

---

## 8) ZIP kaise banayein

- macOS / Linux: folder se zip — **root par `theme.json` ho** (andar sirf ek parent folder bhi chalega, backend flatten karta hai).

```bash
cd path/to/my-theme
zip -r ../my-theme.zip . -x "*.DS_Store" -x "__MACOSX/*"
```

- Andar **`node_modules`**, **`.tsx` / `.ts` source** mat rakho — upload validator reject karega.

---

## 9) Upload (Super Admin)

1. Backend chal raha ho.
2. **Admin app** → **Themes** → **Upload**.
3. Form: **ZIP**, theme name, **platform: web**, optional **slug** (unique; storage path `themes/web/{slug}/`).
4. Success ke baad DB row + `backend/storage/themes/web/{slug}/` extract.

---

## 10) Tenant par lagana + dekhna

1. **Distributor panel** → **Website Builder** → **Storefront theme** → theme / combo select → Apply.
2. Storefront dev: `tenant-apps/storefront-web` → `npm run dev` (default **port 5175**).
3. Browser: `http://{tenants.slug}.localhost:5175` — slug DB ke `tenants.slug` se match hona chahiye.
4. `.env.local` mein `NEXT_PUBLIC_SITE_URL` wahi origin rakho jo browser mein use kar rahe ho.

---

## 11) Reference sample (repo mein)

- **`backend/storage/themes/web/theme1/`** — working v1-style layout (tokens, components paths, templates).
- Script jo demo ZIP banata hai: **`backend/scripts/pack-theme-demo-zip.sh`**.

---

## 12) Common mistakes

| Problem | Fix |
|---------|-----|
| Upload 400 — section not in allowed list | `theme.json` mein `capabilities.allowed_sections` / `allowedSections` mein **saare** template `type` add karo. |
| Page blank / default layout | `templates/home.json` path galat, ya manifest fetch fail; `theme.json` valid JSON check karo. |
| UI change nahi dikhta | Naya theme purane jaisa hi JSON ho; ya **Website Builder** section overrides purane settings merge kar rahe hon — alag JSON / overrides check karo. |
| `xyz.localhost` open nahi hota | Slug DB se match + Linux par `127.0.0.1 yourslug.localhost` `/etc/hosts` mein. |
| **CSS load nahi, images 404** | Default ab monorepo mein **repo-root `storage/`** (`../storage/themes` maujood ho to) — wahi path jahan tum `storage/themes/web/{slug}/` develop karte ho **aur** jahan ZIP extract hota hai. Agar override chahiye: `BACKEND_STORAGE_DIR=./storage` sirf `backend/storage` use karne ke liye. Purani themes sirf `backend/storage/themes/web` par hon to startup **warning** aayegi — unhe `storage/themes/web/` mein copy karo. |
| **`image-text` section error / missing** | Storefront implementation naam **`image-with-text`** hai. Ab alias `image-text` → `image-with-text` registry mein add hai; phir bhi issue ho to template mein `type: "image-with-text"` use karo. |

Browser **Network** tab: `/storage/themes/web/{slug}/assets/css/theme.css` aur image URLs — **200** hone chahiye; **404** = galat disk path ya missing file.

---

## 13) MOBILE theme

Is guide ka focus **WEB** hai. Mobile combo ke liye alag **MOBILE** channel theme + **combo pack** admin flow use hota hai — structure similar hoti hai lekin templates / shell alag ho sakte hain.
