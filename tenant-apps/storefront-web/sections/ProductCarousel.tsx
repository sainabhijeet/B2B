import ProductCard from "@/components/ProductCard";
import ProductCarouselRail from "@/components/catalog/ProductCarouselRail";
import type { ThemeKey } from "@/lib/theme-config";
import { listProducts } from "@/services/productService";
import type { StorefrontListParams, StorefrontProduct } from "@/services/productService";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  brand?: string | null;
  limit?: number;
  categorySlug?: string;
  sort?: StorefrontListParams["sort"];
  languageCode?: string;
  products?: unknown;
  previewCatalog?: boolean;
  variant?: string;
  primaryCta?: string;
  primaryHref?: string;
};

type PreviewProduct = StorefrontProduct & {
  compareAtPrice: number | null;
  stock: number | null;
  badge?: string | null;
  leadTime?: string | null;
  features?: string[];
};

function normalizePreviewProducts(value: unknown): PreviewProduct[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? row.title ?? "").trim();
    if (!name) return [];
    const parsedPrice = typeof row.price === "number" ? row.price : Number(row.price);
    const compareAtPrice = Number(row.compareAtPrice ?? row.compare_at_price ?? row.mrp);
    const stock = Number(row.stock ?? row.stockQuantity ?? row.stock_quantity);
    const moq = Number(row.moq);
    const fallbackSlug = name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
    return [{
      id: String(row.id ?? "").trim() || `preview-product-${fallbackSlug || index + 1}`,
      slug: String(row.slug ?? "").trim() || fallbackSlug || `preview-product-${index + 1}`,
      name,
      description: String(row.description ?? row.subtitle ?? "").trim(),
      price: Number.isFinite(parsedPrice) ? parsedPrice : null,
      compareAtPrice: Number.isFinite(compareAtPrice) ? compareAtPrice : null,
      currency: String(row.currency ?? "INR").trim() || "INR",
      image: String(row.image ?? row.imageUrl ?? row.image_url ?? "").trim() || undefined,
      brand: String(row.brand ?? "").trim() || null,
      categoryName: String(row.categoryName ?? row.category_name ?? "").trim() || null,
      sku: String(row.sku ?? "").trim() || null,
      stock: Number.isFinite(stock) ? stock : null,
      moq: Number.isFinite(moq) ? Math.max(1, moq) : null,
      unit: String(row.unit ?? "").trim() || null,
      packSize: String(row.packSize ?? row.pack_size ?? "").trim() || null,
      badge: String(row.badge ?? "").trim() || null,
      leadTime: String(row.leadTime ?? row.lead_time ?? "").trim() || null,
      features: Array.isArray(row.features) ? row.features.map(String).map((item) => item.trim()).filter(Boolean) : [],
    }];
  });
}

export default async function ProductCarousel({ themeKey, eyebrow, title, subtitle, image, limit, categorySlug, sort, languageCode, products: configuredProducts, previewCatalog = false, variant, primaryCta, primaryHref }: Props) {
  const previewProducts = normalizePreviewProducts(configuredProducts);
  const liveProducts = previewCatalog && previewProducts.length > 0 ? [] : await listProducts({
    limit: 48,
    ...(categorySlug?.trim() ? { category: categorySlug.trim() } : {}),
    ...(sort ? { sort } : {}),
  });
  const products = previewCatalog ? previewProducts : liveProducts;
  const k = themeKey ?? "jewellery";
  const heading = translate(title?.trim() || (k === "electronics" ? "You may also like" : "Related products"), languageCode);
  const supportingText = translate(subtitle?.trim() || "Top-performing products chosen by retailers like you.", languageCode);
  const sectionId = `products-${heading.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "carousel"}`;
  const max = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 6;
  const slice = products.slice(0, max);

  return (
    <ProductCarouselRail
      sectionId={sectionId}
      eyebrow={translate(eyebrow?.trim() || "Retailer favourites", languageCode)}
      heading={heading}
      subtitle={supportingText}
      viewAllLabel={translate(primaryCta?.trim() || "View all products", languageCode)}
      viewAllHref={primaryHref?.trim() || "/category"}
      previousLabel={translate("Previous products", languageCode)}
      nextLabel={translate("Next products", languageCode)}
    >
      {slice.map((p) => (
        <div key={p.slug} className="relative w-[78vw] max-w-[270px] shrink-0 snap-start sm:w-[245px] lg:w-[258px]">
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-slate-950/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm">
            {translate("Popular", languageCode)}
          </span>
          <ProductCard id={p.id} slug={p.slug} name={p.name} description={p.description} price={p.price} mrp={p.mrp} compareAtPrice={"compareAtPrice" in p ? p.compareAtPrice : null} currency={p.currency} image={p.image ?? (previewCatalog ? image : undefined)} brand={p.brand} categoryName={p.categoryName} sku={p.sku} stock={"stock" in p ? p.stock : null} stockQuantity={p.stockQuantity} moq={p.moq} unit={p.unit} packSize={p.packSize} gstRate={p.gstRate} badge={"badge" in p ? p.badge : null} leadTime={"leadTime" in p ? p.leadTime : null} features={"features" in p ? p.features : null} attributes={p.attributes} previewMode={previewCatalog} languageCode={languageCode} variant={variant?.replace(/^products?-|^carousel-/u, "")} />
        </div>
      ))}
    </ProductCarouselRail>
  );
}
