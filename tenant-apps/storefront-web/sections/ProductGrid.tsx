import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";
import { listProducts, type StorefrontProduct } from "@/services/productService";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  subtitle?: string;
  image?: string;
  images?: string[];
  imageLeft?: string;
  imageCenter?: string;
  imageRight?: string;
  /** Theme-packaged demo products used only when the tenant catalogue is empty. */
  products?: unknown;
  /** Set by the runtime only for an explicitly enabled theme preview. */
  previewCatalog?: boolean;
  /** When set, loads `GET /storefront/products?category=<slug>` (tenant catalogue). */
  categorySlug?: string;
  limit?: number;
  languageCode?: string;
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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function normalizePreviewProducts(value: unknown): PreviewProduct[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? row.title ?? "").trim();
    if (!name) return [];
    const rawPrice = row.price;
    const parsedPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice);
    const compareAtPrice = Number(row.compareAtPrice ?? row.compare_at_price ?? row.mrp);
    const stock = Number(row.stock ?? row.stockQuantity ?? row.stock_quantity);
    const moq = Number(row.moq);
    return [{
      id: String(row.id ?? "").trim() || `preview-product-${slugify(name) || index + 1}`,
      slug: String(row.slug ?? "").trim() || slugify(name) || `preview-product-${index + 1}`,
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

export default async function ProductGrid({
  themeKey,
  title,
  subtitle,
  image,
  images,
  imageLeft,
  imageCenter,
  imageRight,
  products: configuredProducts,
  previewCatalog = false,
  categorySlug,
  limit,
  languageCode,
  variant,
  primaryCta,
  primaryHref,
}: Props) {
  const max = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 24) : 12;
  const previewProducts = normalizePreviewProducts(configuredProducts).slice(0, max);
  const liveProducts = previewCatalog && previewProducts.length > 0 ? [] : await listProducts({
    limit: max,
    ...(categorySlug?.trim() ? { category: categorySlug.trim() } : {}),
  });
  const products = previewCatalog ? previewProducts : liveProducts;
  const k = themeKey ?? "jewellery";
  const cardImage = image || imageCenter || imageLeft || imageRight;
  const cardImages = Array.isArray(images) ? images.filter((item) => typeof item === "string" && item.trim()) : [];
  const heading = title?.trim() ?? "";
  const sub = subtitle?.trim() ?? "";
  const t = (text: string) => translate(text, languageCode);
  const viewAllLabel = primaryCta?.trim() || "View all products";
  const viewAllHref = primaryHref?.trim() || "/category";
  return (
    <section
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
      style={{ background: "color-mix(in srgb, var(--theme-surface) 92%, transparent)" }}
      data-theme-key={k}
    >
      <div className="product-grid-heading-row flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="product-grid-heading-copy max-w-3xl">
          <h2 className="text-2xl font-bold" style={{ color: "var(--theme-text)" }}>
            {t(heading)}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--theme-muted)" }}>
            {t(sub)}
          </p>
        </div>
        <Link
          href={viewAllHref}
          className="product-grid-see-all inline-flex min-h-11 shrink-0 items-center justify-center gap-3 border px-5 py-3 text-xs font-extrabold uppercase tracking-[0.08em] transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: "var(--theme-primary)", color: "var(--theme-primary)" }}
          aria-label={`${t(viewAllLabel)}: ${t(heading)}`}
        >
          <span>{t(viewAllLabel)}</span>
          <span aria-hidden="true">&#8594;</span>
        </Link>
      </div>
      {products.length > 0 ? (
        <div
          className="storefront-product-grid mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          tabIndex={0}
          aria-label={t("Product list. Scroll horizontally to view more products")}
        >
          {products.map((p, index) => (
            <ProductCard
              key={p.slug}
              id={p.id}
              slug={p.slug}
              name={t(p.name)}
              price={p.price}
              currency={p.currency}
              image={p.image ?? (previewCatalog ? cardImages[index % cardImages.length] ?? cardImage : undefined)}
              brand={p.brand}
              description={p.description}
              mrp={p.mrp}
              compareAtPrice={"compareAtPrice" in p ? p.compareAtPrice : null}
              categoryName={p.categoryName}
              sku={p.sku}
              stock={"stock" in p ? p.stock : null}
              stockQuantity={p.stockQuantity}
              moq={p.moq}
              unit={p.unit}
              packSize={p.packSize}
              gstRate={p.gstRate}
              badge={"badge" in p ? p.badge : null}
              leadTime={"leadTime" in p ? p.leadTime : null}
              features={"features" in p ? p.features : null}
              attributes={p.attributes}
              previewMode={previewCatalog}
              languageCode={languageCode}
              variant={variant?.replace(/^products-/u, "")}
            />
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-600">
          {t("No products yet")}
        </p>
      )}
    </section>
  );
}
