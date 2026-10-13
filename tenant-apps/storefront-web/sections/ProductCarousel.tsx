import ProductCard from "@/components/ProductCard";
import ProductCarouselRail from "@/components/catalog/ProductCarouselRail";
import type { ThemeKey } from "@/lib/theme-config";
import { listProducts } from "@/services/productService";
import type { StorefrontListParams } from "@/services/productService";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  subtitle?: string;
  image?: string;
  limit?: number;
  categorySlug?: string;
  sort?: StorefrontListParams["sort"];
  languageCode?: string;
};

export default async function ProductCarousel({ themeKey, title, subtitle, image, limit, categorySlug, sort, languageCode }: Props) {
  const products = await listProducts({
    limit: 48,
    ...(categorySlug?.trim() ? { category: categorySlug.trim() } : {}),
    ...(sort ? { sort } : {}),
  });
  const k = themeKey ?? "jewellery";
  const heading = translate(title?.trim() || (k === "electronics" ? "You may also like" : "Related products"), languageCode);
  const supportingText = translate(subtitle?.trim() || "Top-performing products chosen by retailers like you.", languageCode);
  const sectionId = `products-${heading.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "carousel"}`;
  const max = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 6;
  const slice = products.slice(0, max);

  return (
    <ProductCarouselRail
      sectionId={sectionId}
      eyebrow={translate("Retailer favourites", languageCode)}
      heading={heading}
      subtitle={supportingText}
      viewAllLabel={translate("View all products", languageCode)}
      previousLabel={translate("Previous products", languageCode)}
      nextLabel={translate("Next products", languageCode)}
    >
      {slice.map((p) => (
        <div key={p.slug} className="relative w-[78vw] max-w-[270px] shrink-0 snap-start sm:w-[245px] lg:w-[258px]">
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-slate-950/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-sm backdrop-blur-sm">
            {translate("Popular", languageCode)}
          </span>
          <ProductCard id={p.id} slug={p.slug} name={p.name} price={p.price} currency={p.currency} image={p.image ?? image} languageCode={languageCode} />
        </div>
      ))}
    </ProductCarouselRail>
  );
}
