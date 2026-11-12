import Link from "next/link";
import Image from "next/image";
import { translate } from "@/lib/translation-engine";
import { formatCurrency } from "@/lib/language-consistency";
import WishlistButton from "@/components/wishlist/WishlistButton";

type AttributeValue = string | number | boolean | null | undefined;

type Props = {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  price: number | null;
  mrp?: number | null;
  compareAtPrice?: number | null;
  currency?: string;
  image?: string;
  languageCode?: string;
  previewMode?: boolean;
  brand?: string | null;
  categoryName?: string | null;
  sku?: string | null;
  stock?: number | null;
  stockQuantity?: number | null;
  moq?: number | null;
  unit?: string | null;
  packSize?: string | null;
  gstRate?: string | number | null;
  badge?: string | null;
  leadTime?: string | null;
  features?: string[] | null;
  attributes?: Record<string, AttributeValue> | null;
  rating?: number | null;
  reviewCount?: number | null;
  variant?: string;
};

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function attributeLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/[-_]+/gu, " ")
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function productFeatures(features: Props["features"], attributes: Props["attributes"], packSize?: string | null): string[] {
  const rows = Array.isArray(features) ? features : [];
  const attributeRows = attributes && typeof attributes === "object"
    ? Object.entries(attributes).flatMap(([key, value]) => {
        if (value == null || value === "" || typeof value === "object") return [];
        if (["unit", "packSize", "pack_size"].includes(key)) return [];
        return [`${attributeLabel(key)}: ${String(value)}`];
      })
    : [];
  const combined = [
    ...rows,
    ...attributeRows,
    ...(packSize?.trim() ? [`Pack: ${packSize.trim()}`] : []),
  ].map((item) => String(item).trim()).filter(Boolean);
  return [...new Set(combined)].slice(0, 3);
}

export default function ProductCard({
  id,
  slug,
  name,
  description,
  price,
  mrp,
  compareAtPrice,
  currency = "INR",
  image,
  languageCode,
  previewMode = false,
  brand,
  categoryName,
  sku,
  stock,
  stockQuantity,
  moq,
  unit,
  packSize,
  gstRate,
  leadTime,
  features,
  attributes,
  rating,
  reviewCount,
  variant,
}: Props) {
  const t = (value: string) => translate(value, languageCode);
  const productHref = `/product/${encodeURIComponent(slug)}`;
  const comparePrice = finiteNumber(compareAtPrice ?? mrp);
  const discount = price != null && comparePrice != null && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0;
  const featureRows = productFeatures(features, attributes, packSize);
  const cleanDescription = description?.trim() ?? "";
  const cleanBrand = brand?.trim() ?? "";
  const cleanCategory = categoryName?.trim() ?? "";
  const normalizedRating = rating == null ? null : Math.min(5, Math.max(0, rating));
  const availableStock = finiteNumber(stock ?? stockQuantity);
  const minimumOrder = finiteNumber(moq);
  const isClinicalRegister = variant === "clinical-register";
  const isMaterialTradeRail = variant === "material-trade-rail";
  const clinicalDispatch = leadTime?.trim().replace(/^sample dispatch:\s*/iu, "");

  return (
    <article
      className="product-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
      data-card-variant={variant ?? "default"}
      style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
    >
      {id ? <div className="absolute right-3 top-3 z-20"><WishlistButton productId={id} productName={name} productSlug={slug} productImage={image} productSku={sku ?? ""} productPrice={price} productCurrency={currency} productBrand={brand} previewMode={previewMode} languageCode={languageCode} compact /></div> : null}
      <Link
        href={productHref}
        prefetch
        aria-label={`${t("View")} ${name}`}
        className="flex h-full flex-1 flex-col rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--theme-primary)]"
      >
        <div className="product-card-media relative aspect-square w-full overflow-hidden">
          {image ? (
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" unoptimized />
          ) : (
            <div className="h-full w-full" style={{ background: "color-mix(in srgb, var(--theme-secondary) 24%, white)" }} aria-hidden />
          )}
          {isClinicalRegister ? (
            <span className="clinical-product-status">
              {availableStock != null && availableStock > 0 ? t("Available") : t("On request")}
            </span>
          ) : null}
        </div>

        <div className="product-card-body flex flex-1 flex-col gap-2.5 p-4">
          {isClinicalRegister && (cleanCategory || cleanBrand) ? (
            <div className="product-card-meta flex min-w-0 items-center text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--theme-muted)" }}>
              <span className="truncate">{t(cleanCategory || cleanBrand)}</span>
            </div>
          ) : cleanBrand || cleanCategory ? (
            <div className="product-card-meta flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--theme-muted)" }}>
              {cleanBrand ? <span className="truncate">{t(cleanBrand)}</span> : null}
              {cleanBrand && cleanCategory ? <span aria-hidden="true">&bull;</span> : null}
              {cleanCategory ? <span className="truncate">{t(cleanCategory)}</span> : null}
            </div>
          ) : null}

          <h3 className="product-card-title line-clamp-2 text-[15px] font-bold leading-5 group-hover:underline" style={{ color: "var(--theme-text)" }}>
            {name}
          </h3>

          {normalizedRating != null ? (
            <div className="product-card-rating flex items-center gap-2 text-xs">
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold"
                style={{ background: "var(--theme-primary)", color: "var(--theme-primary-contrast)" }}
              >
                {normalizedRating.toFixed(1)} <span aria-hidden="true">&#9733;</span>
              </span>
              {reviewCount != null ? <span style={{ color: "var(--theme-muted)" }}>{reviewCount.toLocaleString(languageCode)} {t("reviews")}</span> : null}
            </div>
          ) : null}

          {cleanDescription && !isClinicalRegister ? (
            <div className="product-card-description line-clamp-2 text-xs leading-5" style={{ color: "var(--theme-muted)", fontWeight: 500 }}>
              {t(cleanDescription)}
            </div>
          ) : null}

          {isClinicalRegister ? (
            <dl className="clinical-product-facts" aria-label={t("Buying details")}>
              <div><dt>{t("MOQ")}</dt><dd>{minimumOrder == null ? t("On request") : `${minimumOrder} ${t(unit?.trim() || "units")}`}</dd></div>
              <div><dt>{t("Dispatch")}</dt><dd>{clinicalDispatch ? t(clinicalDispatch) : t("On request")}</dd></div>
            </dl>
          ) : null}

          {isMaterialTradeRail ? (
            <dl className="material-trade-card-facts" aria-label={t("Buying details")}>
              <div><dt>{t("MOQ")}</dt><dd>{minimumOrder == null ? t("On request") : minimumOrder}</dd></div>
              <div><dt>{t("Pack")}</dt><dd>{t(packSize?.trim() || unit?.trim() || "Trade pack")}</dd></div>
            </dl>
          ) : null}

          {!isClinicalRegister && !isMaterialTradeRail && featureRows.length ? (
            <ul className="product-card-features space-y-1 text-[11px] leading-4" style={{ color: "var(--theme-text)" }} aria-label={t("Key features")}>
              {featureRows.map((feature, index) => (
                <li key={`${feature}-${index}`} className={`flex gap-1.5 ${index > 0 ? "hidden sm:flex" : ""}`}>
                  <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[var(--theme-primary)]" aria-hidden="true" />
                  <span className="line-clamp-1">{t(feature)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="product-card-purchase mt-auto border-t pt-3" style={{ borderColor: "var(--theme-border)" }}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="product-card-price text-lg font-black leading-none" style={{ color: "var(--theme-primary)" }}>
                {price == null ? t("Sign in to see price") : formatCurrency(price, languageCode, currency)}
              </p>
              {price != null && comparePrice != null && comparePrice > price ? (
                <span className="product-card-mrp text-[11px] line-through" style={{ color: "var(--theme-muted)" }}>
                  {formatCurrency(comparePrice, languageCode, currency)}
                </span>
              ) : null}
              {discount > 0 ? <span className="product-card-discount text-[11px] font-extrabold" style={{ color: "var(--theme-primary)" }}>{discount}% {t("off")}</span> : null}
            </div>
            {gstRate != null && String(gstRate).trim() ? (
              <span className="mt-1 block text-[10px]" style={{ color: "var(--theme-muted)" }}>{t("GST")}: {String(gstRate).replace(/%$/u, "")}%</span>
            ) : null}

            {!isClinicalRegister && (leadTime?.trim() || sku?.trim()) ? (
              <div className="product-card-fulfilment mt-2 line-clamp-1 text-[10px]" style={{ color: "var(--theme-muted)" }}>
                {leadTime?.trim() ? t(leadTime.trim()) : `${t("SKU")}: ${sku?.trim()}`}
              </div>
            ) : null}

            <div className="product-card-view mt-3 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--theme-primary)" }}>
              <span>{t("View product details")}</span>
              <span aria-hidden="true">&#8594;</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
