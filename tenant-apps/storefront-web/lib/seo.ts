import type { StorefrontProduct } from "@/services/productService";

export function productJsonLd(product: StorefrontProduct, canonicalUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    url: canonicalUrl,
    offers: {
      "@type": "Offer",
      price: String(product.price),
      priceCurrency: product.currency,
      availability: "https://schema.org/InStock",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
