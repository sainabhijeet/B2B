import { ALL_ECOMMERCE_SECTION_TYPES } from "@/registry/sectionCatalog";
import { isSectionCategory, type SectionCategory } from "./section-categories";

/**
 * Canonical mapping: catalog `type` / schema `name` → taxonomy category.
 * Anything unknown falls back to `utility` (safe for new theme keys until taxonomy is updated).
 */
const RAW_SECTION_TYPE_TO_CATEGORY: Record<string, SectionCategory> = {
  // Layout & page chrome
  header: "layout",
  "announcement-bar": "layout",
  "navigation-menu": "layout",
  "search-bar": "layout",
  "mega-menu": "layout",
  breadcrumb: "layout",
  "filter-sidebar": "layout",
  "filter-tags": "layout",
  "filter-price": "layout",
  "filter-brand": "layout",
  "filter-attributes": "layout",
  "sort-dropdown": "layout",
  "cart-items": "layout",
  "cart-summary": "layout",
  "cart-discount": "layout",
  "cart-cross-sell": "layout",
  "cart-recommendations": "layout",
  "checkout-summary": "layout",
  "checkout-address": "layout",
  "checkout-shipping": "layout",
  "checkout-payment": "layout",
  "checkout-confirmation": "layout",
  "checkout-form": "layout",
  "account-dashboard": "layout",
  "account-orders": "layout",
  "account-address": "layout",
  "account-profile": "layout",
  "account-wishlist": "layout",
  "account-recent-orders": "layout",
  "auth-form": "layout",
  "order-history": "layout",
  "order-summary": "layout",
  "search-results": "layout",
  "search-suggestions": "layout",
  "search-empty": "layout",
  "header-basic": "layout",
  "collection-grid": "categories",

  // Hero
  "hero-banner": "hero",
  "hero-slider": "hero",
  "hero-video": "hero",
  "hero-split": "hero",
  "hero-carousel": "hero",
  "hero-parallax": "hero",
  "hero-minimal": "hero",
  "hero-fullscreen": "hero",
  hero: "hero",

  // Product lists & PDP
  "product-grid": "products",
  "product-slider": "products",
  "featured-products": "products",
  "new-arrivals": "products",
  "best-sellers": "products",
  "trending-products": "products",
  "recommended-products": "products",
  "related-products": "products",
  "recently-viewed-products": "products",
  "flash-sale-products": "products",
  "flash-sale": "products",
  "latest-products": "products",
  "recently-viewed": "products",
  "wishlist-products": "products",
  "product-listing": "products",
  "product-gallery": "products",
  "product-title": "products",
  "product-price": "products",
  "product-variants": "products",
  "product-description": "products",
  "product-specifications": "products",
  "product-reviews": "products",
  "product-rating": "products",
  "product-share": "products",
  "product-faq": "products",
  "product-video": "products",
  "product-bundle": "products",
  "product-carousel": "products",
  "product-detail": "products",
  "product-accordion": "products",
  "product-tabs": "products",
  reviews: "products",

  // Category / collection discovery
  "category-grid": "categories",
  "category-slider": "categories",
  "category-banner": "categories",
  "category-carousel": "categories",
  "category-featured": "categories",
  "subcategory-list": "categories",
  "category-icons": "categories",
  "category-cards": "categories",
  "category-hero": "categories",
  "category-products": "products",

  // Editorial & media
  "rich-text": "content",
  "image-with-text": "content",
  "image-grid": "content",
  "image-gallery": "content",
  "video-section": "content",
  "testimonial-slider": "content",
  "testimonial-grid": "content",
  "testimonial-carousel": "content",
  testimonials: "content",
  testimonial: "content",
  "blog-preview": "content",
  "blog-list": "content",
  "blog-featured": "content",
  "blog-article": "content",
  "blog-sidebar": "content",
  "blog-author": "content",
  "blog-comments": "content",
  faq: "content",
  "faq-section": "content",
  "editorial-banner": "content",
  timeline: "content",

  // Conversion & promo
  "promo-banner": "marketing",
  "discount-banner": "marketing",
  "offer-strip": "marketing",
  "coupon-banner": "marketing",
  "deal-of-the-day": "marketing",
  "countdown-offer": "marketing",
  "seasonal-sale": "marketing",
  "campaign-banner": "marketing",
  countdown: "marketing",
  "feature-banner": "marketing",
  "video-banner": "marketing",
  "instagram-feed": "marketing",
  cta: "marketing",
  "cta-banner": "marketing",
  "cta-split": "marketing",
  newsletter: "marketing",
  "newsletter-signup": "marketing",
  "subscribe-section": "marketing",
  "app-download": "marketing",
  "contact-banner": "marketing",
  "mobile-app-banner": "marketing",
  "scan-qr": "marketing",

  // Trust
  "trust-badges": "trust",
  "payment-icons": "trust",
  "certification-logos": "trust",
  "security-badges": "trust",
  "guarantee-banner": "trust",
  "shipping-info": "trust",
  "return-policy": "trust",

  // Brand
  "brand-grid": "brand",
  "brand-slider": "brand",
  "brand-carousel": "brand",
  "brand-spotlight": "brand",
  "brand-story": "brand",
  "brand-logos": "brand",

  // Footer
  footer: "footer",
  "footer-columns": "footer",
  "copyright-bar": "footer",

  // B2B / distributor SaaS
  "wholesale-pricing": "b2b",
  "bulk-order-table": "b2b",
  "credit-limit-info": "b2b",
  "minimum-order-info": "b2b",
  "distributor-banner": "b2b",
  "dealer-benefits": "b2b",

  // Utility
  divider: "utility",
  spacer: "utility",
  "icon-list": "utility",
  "logo-strip": "utility",
  "stat-counter": "utility",
  "feature-grid": "utility",
  "feature-list": "utility",
  gallery: "utility",
  "compare-table": "utility",
  "header-mega-menu": "layout",
  "not-found": "utility",
  "page-hero": "hero",

  // Advanced / interactive
  "3d-product-viewer": "advanced",
  "interactive-gallery": "advanced",
  "before-after-slider": "advanced",
  "comparison-table": "advanced",
  configurator: "advanced",
  "product-builder": "advanced",
};

/** Additional engine schema names not yet in `ALL_ECOMMERCE_SECTION_TYPES`. */
const EXTRA_ENGINE_SCHEMA_NAMES = new Set(["collection-grid", "testimonial"]);

function buildCatalogDrivenTaxonomy(raw: Record<string, SectionCategory>): Record<string, SectionCategory> {
  const catalog = new Set(ALL_ECOMMERCE_SECTION_TYPES.map((t) => t.trim().toLowerCase()));
  const out: Record<string, SectionCategory> = {};
  for (const [key, cat] of Object.entries(raw)) {
    const k = key.trim().toLowerCase();
    if (catalog.has(k) || EXTRA_ENGINE_SCHEMA_NAMES.has(k)) {
      out[k] = cat;
    }
  }
  return out;
}

const SECTION_TYPE_TO_CATEGORY = buildCatalogDrivenTaxonomy(RAW_SECTION_TYPE_TO_CATEGORY);

export function getSectionCategory(sectionTypeOrName: string): SectionCategory {
  const k = sectionTypeOrName.trim().toLowerCase();
  return SECTION_TYPE_TO_CATEGORY[k] ?? "utility";
}

/** Optional dev guard: every catalog key should resolve intentionally (not only utility). */
export function listCatalogTypesMissingTaxonomy(): string[] {
  const missing: string[] = [];
  for (const t of ALL_ECOMMERCE_SECTION_TYPES) {
    const k = t.trim().toLowerCase();
    if (SECTION_TYPE_TO_CATEGORY[k] === undefined) missing.push(t);
  }
  return missing;
}

/** If JSON override sends `category`, validate; else derive from name. */
export function resolveSectionCategory(
  name: string,
  rawCategory: string | null | undefined,
): SectionCategory {
  const c = rawCategory?.trim().toLowerCase();
  if (c && isSectionCategory(c)) return c;
  return getSectionCategory(name);
}
