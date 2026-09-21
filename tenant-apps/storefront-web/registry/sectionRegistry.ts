import type { ComponentType } from "react";
import type { ThemeKey } from "@/lib/theme-config";
import AccountDashboardSection from "@/sections/AccountDashboardSection";
import BlogPreviewSection from "@/sections/BlogPreviewSection";
import BrandLogosSection from "@/sections/BrandLogosSection";
import CartSummarySection from "@/sections/CartSummarySection";
import CategoryGrid from "@/sections/CategoryGrid";
import CheckoutSummarySection from "@/sections/CheckoutSummarySection";
import CtaBannerSection from "@/sections/CtaBannerSection";
import DividerSection from "@/sections/DividerSection";
import EditorialBanner from "@/sections/EditorialBanner";
import FaqSection from "@/sections/FaqSection";
import FilterSidebarSection from "@/sections/FilterSidebarSection";
import FooterColumns from "@/sections/FooterColumns";
import Header from "@/sections/Header";
import HeroBanner from "@/sections/HeroBanner";
import HeroSplit from "@/sections/HeroSplit";
import IconListSection from "@/sections/IconListSection";
import ImageWithTextSection from "@/sections/ImageWithTextSection";
import Newsletter from "@/sections/Newsletter";
import ProductCarousel from "@/sections/ProductCarousel";
import ProductDetail from "@/sections/ProductDetail";
import ProductGallerySection from "@/sections/ProductGallerySection";
import ProductGrid from "@/sections/ProductGrid";
import ProductInfoSection from "@/sections/ProductInfoSection";
import PromoStripSection from "@/sections/PromoStripSection";
import RichTextSection from "@/sections/RichTextSection";
import SearchResultsSection from "@/sections/SearchResultsSection";
import SpacerSection from "@/sections/SpacerSection";
import TestimonialCarousel from "@/sections/TestimonialCarousel";
import { ALL_ECOMMERCE_SECTION_TYPES, LEGACY_SECTION_TYPE_ALIASES } from "@/registry/sectionCatalog";

export type SectionProps = Record<string, unknown> & { themeKey?: ThemeKey; variant?: string };

function makeUnsupportedSectionComponent(sectionType: string): ComponentType<SectionProps> {
  function UnsupportedSection() {
    return null;
  }
  UnsupportedSection.displayName = `UnsupportedSection(${sectionType})`;
  return UnsupportedSection;
}

/** Hand-written implementations and aliases. */
const sectionImplementations: Record<string, Record<string, ComponentType<SectionProps>>> = {
  hero: {
    banner: HeroBanner,
    split: HeroSplit,
    default: HeroBanner,
  },
  "hero-banner": { default: HeroBanner },
  "hero-split": { default: HeroSplit },
  header: { default: Header },
  "header-basic": { default: Header },
  "announcement-bar": { default: PromoStripSection },
  "category-grid": { default: CategoryGrid },
  productgrid: { default: ProductGrid },
  "product-grid": { default: ProductGrid },
  "featured-products": { default: ProductGrid },
  "new-arrivals": { default: ProductGrid },
  "best-sellers": { default: ProductGrid },
  "trending-products": { default: ProductGrid },
  "recommended-products": { default: ProductGrid },
  "related-products": { default: ProductGrid },
  "recently-viewed-products": { default: ProductGrid },
  "flash-sale-products": { default: ProductGrid },
  "product-carousel": { default: ProductCarousel },
  "product-slider": { default: ProductCarousel },
  "product-detail": { default: ProductDetail },
  "product-gallery": { default: ProductGallerySection },
  "image-gallery": { default: ProductGallerySection },
  "image-grid": { default: ProductGallerySection },
  "product-info": { default: ProductInfoSection },
  "product-title": { default: ProductInfoSection },
  "product-price": { default: ProductInfoSection },
  "product-description": { default: ProductInfoSection },
  newsletter: { default: Newsletter },
  "newsletter-signup": { default: Newsletter },
  "subscribe-section": { default: Newsletter },
  "testimonial-carousel": { default: TestimonialCarousel },
  "testimonial-slider": { default: TestimonialCarousel },
  "testimonial-grid": { default: TestimonialCarousel },
  "editorial-banner": { default: EditorialBanner },
  "promo-banner": { default: PromoStripSection },
  "discount-banner": { default: PromoStripSection },
  "offer-strip": { default: PromoStripSection },
  "coupon-banner": { default: PromoStripSection },
  "deal-of-the-day": { default: PromoStripSection },
  "countdown-offer": { default: PromoStripSection },
  "seasonal-sale": { default: PromoStripSection },
  "campaign-banner": { default: PromoStripSection },
  "cta-banner": { default: CtaBannerSection },
  "cta-split": { default: CtaBannerSection },
  "brand-slider": { default: BrandLogosSection },
  "brand-logos": { default: BrandLogosSection },
  "brand-grid": { default: BrandLogosSection },
  "brand-carousel": { default: BrandLogosSection },
  "brand-spotlight": { default: BrandLogosSection },
  "brand-story": { default: BrandLogosSection },
  "rich-text": { default: RichTextSection },
  "image-with-text": { default: ImageWithTextSection },
  "icon-list": { default: IconListSection },
  divider: { default: DividerSection },
  spacer: { default: SpacerSection },
  faq: { default: FaqSection },
  "faq-section": { default: FaqSection },
  "product-faq": { default: FaqSection },
  "blog-preview": { default: BlogPreviewSection },
  "filter-sidebar": { default: FilterSidebarSection },
  "cart-summary": { default: CartSummarySection },
  "cart-items": { default: CartSummarySection },
  "cart-discount": { default: CartSummarySection },
  "cart-cross-sell": { default: CartSummarySection },
  "cart-recommendations": { default: CartSummarySection },
  "checkout-summary": { default: CheckoutSummarySection },
  "account-dashboard": { default: AccountDashboardSection },
  "search-results": { default: SearchResultsSection },
  "footer-columns": { default: FooterColumns },
  footer: {
    columns: FooterColumns,
    default: FooterColumns,
  },
};

function buildRegistry(): Record<string, Record<string, ComponentType<SectionProps>>> {
  const out: Record<string, Record<string, ComponentType<SectionProps>>> = {};
  for (const type of ALL_ECOMMERCE_SECTION_TYPES) {
    out[type] = { default: makeUnsupportedSectionComponent(type) };
  }
  for (const [type, variants] of Object.entries(sectionImplementations)) {
    out[type] = variants;
  }
  return out;
}

export const sectionRegistry = buildRegistry();

export function resolveSectionFromRegistry(
  id: string,
  variant?: string | null,
): ComponentType<SectionProps> | null {
  const key = String(id ?? "").trim().toLowerCase();
  const mapped = LEGACY_SECTION_TYPE_ALIASES[key] ?? key;
  const variants = sectionRegistry[mapped];
  if (!variants) return null;
  if (variant != null && String(variant).trim() !== "") {
    const byVariant = variants[String(variant).trim().toLowerCase()];
    if (byVariant) return byVariant;
  }
  return variants.default ?? null;
}
