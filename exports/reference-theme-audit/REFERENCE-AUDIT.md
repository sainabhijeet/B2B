# Reference Theme UI/UX Audit

Audit date: 26 October 2026  
Desktop capture: 1440 × 1100  
Scope: visual first fold, navigation hierarchy, hero composition, ecommerce suitability, and reusable design direction. No source code or copyrighted assets should be copied.

## Executive conclusion

The strongest usable visual references are:

1. **Shome Home 2** for image-led footwear retail.
2. **Industrie Blue / Red** for modern industrial presentation, but they are one layout recolored and must not be treated as separate design systems.
3. **Machinery** for a high-information B2B industrial storefront shell.
4. **Jovenca** for clean product-led luxury commerce.
5. **Jowenly** for an editorial, asymmetrical jewelry direction.
6. **Gowala** for a highly branded FMCG/agriculture campaign direction.
7. **Keymoto** for a dramatic automotive identity.

The Porto pages returned bot-verification or blank states in automated Chrome, so they are not accepted as verified visual references in this audit. Electricien, Fixpro Dark, Industify, Vemus, Botanical, and the Yolo Motor selector also could not be reliably rendered. They should be rechecked manually before using them as visual specifications.

## Reference-by-reference findings

### General references — Porto

| Reference | Result | UI/UX finding |
|---|---|---|
| Porto Demo 10 | Bot-verification screen | The DOM exposes a dense commerce shell: currency, account, search, navigation and cart. Visual design was not verifiable. |
| Porto Demo 3 | Blank/blocked | Search/category/cart structure is present in the page content, but the rendered design was unavailable. |
| Porto Demo 18 | Blank/blocked | A marketplace-oriented shop-by-category structure is detectable; visual details were unavailable. |
| Porto Demo 19 | 403/blank | Reject as a visual source until manually accessible. |

### Electronics

| Reference | Result | UI/UX finding |
|---|---|---|
| Electricien | Timeout/blocked | Appears to be a service-company landing page rather than an electronics product storefront. Do not use it as the main ecommerce layout without adding catalog, search, filters and product merchandising. |
| Fixpro Dark | Timeout/blocked | Could not be visually verified. Do not assign its design direction yet. |

**Recommended direction:** a technical marketplace shell with prominent search, category mega-navigation, specification cards, comparison and stock status. The Porto/Ecomshop information architecture is more relevant than an electrician service-site layout.

### Footwear

| Reference | Result | UI/UX finding |
|---|---|---|
| Shome Home 1 | Captured | Strong product-first hero, obvious search and actions, bold retail identity. Header is tall and the red navigation capsule feels dated. |
| Shome Home 2 | Captured | Strongest footwear reference. Lifestyle photography, direct CTA and cleaner fashion hierarchy create better emotional merchandising. |
| Ecomshop | Captured | Dense marketplace header with category/search/account/cart. Useful for catalog-heavy B2B buying, but typography and navigation feel dated. |

**Recommended direction:** use Shome Home 2 for homepage composition and product imagery; use Ecomshop only for functional search/category density on PLP and ordering screens.

### Textile

| Reference | Result | UI/UX finding |
|---|---|---|
| Industify | Browser timeout; page content readable | Corporate industrial storytelling with sectors, projects and credibility sections. It needs product/category commerce modules for this platform. |
| Industrie Blue | Captured | Clean horizontal navigation, dominant full-bleed image and strong CTA. Modern and immediately industrial. |
| Industrie Red | Captured | Dramatic engineering presentation and strong contrast. It is structurally the same family as Blue. |
| Industrie Default | Browser timeout; page content readable | Same Industrie family and navigation model. It must not count as another unique layout. |

**Recommended direction:** retain full-bleed industrial storytelling, then add textile-specific swatch navigation, material filters, GSM/composition data and roll/MOQ ordering. Blue/Red must not be copied as separate recolored themes.

### Industrial Equipment

| Reference | Result | UI/UX finding |
|---|---|---|
| Industriaz | Partially captured | Excellent floating pill navigation, oversized headline and clear quote/project CTA. Hero background failed to load, so asset behavior needs rechecking. |
| Factory | Partially captured | Strong B2B credibility shell: address, phone, email, dark navigation and high-contrast quote CTA. The hero asset loaded poorly in capture. |

**Recommended direction:** combine Industriaz's modern floating header with Factory's operational contact/quote information. Product specs and RFQ should replace generic project-only content.

### Machinery

| Reference | Result | UI/UX finding |
|---|---|---|
| Machinery | Captured | Best machinery reference. Enterprise utility header, dark navigation, quote CTA, dramatic industrial hero, certification strip and sector-based hierarchy. |
| Dynamic | Captured | Clear corporate shell and navigation, but consultancy imagery is not appropriate for machinery commerce. Use shell ideas only. |
| Finance | Partially captured | Header rendered but the hero produced a very large blank region. Reject this implementation pattern. |

**Recommended direction:** use Machinery's high-information header and hero hierarchy, then introduce quick specification comparison, spare-parts categories, RFQ and stock/lead-time data.

### Jewelry / Diamond

| Reference | Result | UI/UX finding |
|---|---|---|
| Vemus Intro | Timeout/blocked | Not verifiable. |
| Jovenca | Captured | Clean centered branding, restrained neutral palette, product-led hero and immediately visible category row. Highly usable luxury commerce. |
| Jowenly | Captured | Strongest unique art direction: asymmetrical editorial grid, serif typography, layered imagery and generous whitespace. Less dense, more premium. |

**Recommended direction:** use Jovenca for category/PLP usability and Jowenly for homepage/PDP storytelling. Do not flatten both into the same card grid.

### General Commerce

| Reference | Result | UI/UX finding |
|---|---|---|
| Botanical | Timeout/blocked | Not verifiable. |
| Gowala | Captured | Highly branded campaign hero, floating navigation and memorable illustration. Strong for FMCG/dairy/agriculture, but too category-specific for a universal marketplace. |

**Recommended direction:** general commerce should use a flexible marketplace/search layout. Gowala is better assigned to FMCG or agriculture rather than the general theme.

### Automotive & Spare Parts

| Reference | Result | UI/UX finding |
|---|---|---|
| Yolo Motor selector | Selector/timeout | The supplied URL is a theme selector rather than a stable Motor demo. Not accepted as a visual specification. |
| Keymoto | Captured | Strongest automotive direction: black/red palette, condensed display type, image-led hero, angular section transition and purposeful CTAs. |

**Recommended direction:** keep Keymoto's visual energy but replace generic marketing with vehicle/part lookup, make/model filters, fitment status, SKU and stock information.

## Cross-theme rules to take into implementation

- Match header density to the buying task: editorial/luxury can be minimal; marketplace and B2B themes need search and categories.
- Keep the primary product/category visible within the first desktop fold.
- Use category-specific typography and image treatment, not just different colors.
- Make hero composition, category navigation, product cards, PLP, PDP and footer structurally different.
- Translate service-site references into commerce UX; never omit product search, filters, pricing/quote, stock, cart and checkout.
- Avoid giant empty slider regions, excessive utility bars, outdated nested menus and decorative elements that hide buying actions.
- Never count color variants of the same template as unique layouts.
- Use references for hierarchy and interaction patterns only. Do not copy logos, images, text or proprietary code/assets.

## Capture status

- URLs checked: **25**
- Usable/partial Chrome captures: **15**
- Blocked, blank or failed captures: **10**
- Labelled contact sheet: `reference-themes-contact-sheet.jpg`
- Machine-readable capture report: `reference-theme-audit.json`

