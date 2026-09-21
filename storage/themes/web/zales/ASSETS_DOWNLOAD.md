# ZALES theme — image assets

All raster paths live under `assets/images/`. The theme ZIP includes **placeholder PNGs** (solid colour tiles) so paths resolve before you export finals from Figma.

## Replace with your exports (recommended filenames)

| File in theme | Use in design | Export hints |
|---------------|---------------|----------------|
| `logo.svg` | ZALES wordmark | Vector from Figma |
| `hero-woman.png` | Hero circular crop (model + jewellery) | ~1200×1500, WebP optional |
| `category-arch.png` | Tall arch lifestyle | Portrait, transparent BG optional |
| `product-bracelet.png` | Bracelet cut-out / on grey | PNG/WebP |
| `product-necklace.png` | Necklace product | PNG/WebP |
| `product-ring.png` | Gold band product | PNG/WebP |
| `product-ring-coral.png` | Black coral ring | PNG/WebP |
| `lifestyle-hand.png` | Hand + ring close-up | Square ~1200 |
| `lifestyle-necklaces.png` | Layered necklaces on model | Landscape |
| `brand-logos.png` | Faded partner logo strip | Wide PNG or composite |
| `hero-reference.png` | Optional full mock reference | Any |

## Regenerate placeholder PNGs locally

From repo root:

```bash
bash saas-platform/storage/themes/web/zales/scripts/gen-placeholders.sh
```

Then replace each file with your real export (keep the same filename so `templates/*.json` does not need edits).

## One-shot ZIP (theme root = ZIP root)

```bash
cd saas-platform/storage/themes/web/zales
zip -r ../zales-theme.zip . -x "*.DS_Store" -x "scripts/*"
```

Include `scripts/` in the ZIP only if you want designers to regenerate placeholders; otherwise omit with `-x` as above.
