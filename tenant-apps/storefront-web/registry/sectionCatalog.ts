/**
 * Universal ecommerce section type keys (kebab-case) for scalable themes.
 * Theme ZIP templates use `type` from this catalog; React implementations live under
 * `sections/` and are registered in `sectionRegistry.ts`.
 */

/** ~25 sections to prioritise for full UX + QA. */
export const CORE_SECTION_TYPES = [
  "header",
  "footer",
  "hero-banner",
  "category-grid",
  "product-grid",
  "product-gallery",
  "product-info",
  "promo-banner",
  "brand-slider",
  "testimonial-slider",
  "cta-banner",
  "newsletter",
  "faq",
  "faq-section",
  "blog-preview",
  "filter-sidebar",
  "cart-summary",
  "checkout-summary",
  "account-dashboard",
  "search-results",
  "rich-text",
  "image-with-text",
  "image-gallery",
  "icon-list",
  "divider",
  "spacer",
] as const;

/** Legacy template keys still supported. */
export const LEGACY_SECTION_TYPE_ALIASES: Record<string, string> = {
  hero: "hero",
  herobanner: "hero-banner",
  herosplit: "hero-split",
  headerbasic: "header-basic",
  footercolumns: "footer-columns",
  productgrid: "product-grid",
  /** Common in theme JSON; registry implementation is `image-with-text`. */
  "image-text": "image-with-text",
  imagetext: "image-with-text",
};

const RAW_ECATALOG_TYPES = [
  // Global layout
  "header",
  "announcement-bar",
  "navigation-menu",
  "search-bar",
  "mega-menu",
  "breadcrumb",
  "footer",
  "newsletter",
  "copyright-bar",
  // Hero
  "hero-banner",
  "hero-slider",
  "hero-video",
  "hero-split",
  "hero-carousel",
  "hero-parallax",
  "hero-minimal",
  "hero-fullscreen",
  // Category
  "category-grid",
  "category-slider",
  "category-banner",
  "category-carousel",
  "category-featured",
  "subcategory-list",
  "category-icons",
  "category-cards",
  // Product lists
  "product-grid",
  "product-slider",
  "featured-products",
  "new-arrivals",
  "best-sellers",
  "trending-products",
  "recommended-products",
  "related-products",
  "recently-viewed-products",
  "flash-sale-products",
  // PDP
  "product-gallery",
  "product-title",
  "product-price",
  "product-variants",
  "product-description",
  "product-specifications",
  "product-reviews",
  "product-rating",
  "product-share",
  "product-faq",
  "product-video",
  "product-bundle",
  // Promotion
  "promo-banner",
  "discount-banner",
  "offer-strip",
  "coupon-banner",
  "deal-of-the-day",
  "countdown-offer",
  "seasonal-sale",
  "campaign-banner",
  // Trust
  "trust-badges",
  "payment-icons",
  "certification-logos",
  "security-badges",
  "guarantee-banner",
  "shipping-info",
  "return-policy",
  // Brand
  "brand-grid",
  "brand-slider",
  "brand-carousel",
  "brand-spotlight",
  "brand-story",
  "brand-logos",
  // Content
  "rich-text",
  "image-with-text",
  "image-grid",
  "image-gallery",
  "video-section",
  "testimonial-slider",
  "testimonial-grid",
  "blog-preview",
  "faq",
  "faq-section",
  // CTA
  "cta-banner",
  "cta-split",
  "newsletter-signup",
  "subscribe-section",
  "app-download",
  "contact-banner",
  // Cart
  "cart-items",
  "cart-summary",
  "cart-discount",
  "cart-cross-sell",
  "cart-recommendations",
  // Checkout
  "checkout-summary",
  "checkout-address",
  "checkout-shipping",
  "checkout-payment",
  "checkout-confirmation",
  // Account
  "account-dashboard",
  "account-orders",
  "account-address",
  "account-profile",
  "account-wishlist",
  "account-recent-orders",
  // Search
  "search-results",
  "search-suggestions",
  "search-empty",
  // Filters
  "filter-sidebar",
  "filter-tags",
  "filter-price",
  "filter-brand",
  "filter-attributes",
  "sort-dropdown",
  // Blog
  "blog-list",
  "blog-featured",
  "blog-article",
  "blog-sidebar",
  "blog-author",
  "blog-comments",
  // Utility
  "divider",
  "spacer",
  "icon-list",
  "logo-strip",
  "stat-counter",
  "feature-grid",
  "timeline",
  // Marketplace / B2B
  "wholesale-pricing",
  "bulk-order-table",
  "credit-limit-info",
  "minimum-order-info",
  "distributor-banner",
  "dealer-benefits",
  // Mobile / app
  "mobile-app-banner",
  "scan-qr",
  // Advanced
  "3d-product-viewer",
  "interactive-gallery",
  "before-after-slider",
  "comparison-table",
  "configurator",
  "product-builder",
  // Legacy keys used in shipped JSON
  "hero",
  "header-basic",
  "footer-columns",
  "editorial-banner",
  "testimonial-carousel",
  "product-carousel",
  "product-detail",
] as const;

export const ALL_ECOMMERCE_SECTION_TYPES: readonly string[] = [...new Set(RAW_ECATALOG_TYPES)];

export function isKnownSectionType(type: string): boolean {
  const k = type.trim().toLowerCase();
  return ALL_ECOMMERCE_SECTION_TYPES.includes(k);
}
