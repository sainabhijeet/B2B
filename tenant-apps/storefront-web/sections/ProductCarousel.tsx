import ProductCard from "@/components/ProductCard";
import type { ThemeKey } from "@/lib/theme-config";
import { listProducts } from "@/services/productService";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  image?: string;
  limit?: number;
  categorySlug?: string;
  languageCode?: string;
};

export default async function ProductCarousel({ themeKey, title, image, limit, categorySlug, languageCode }: Props) {
  const products = await listProducts({
    limit: 48,
    ...(categorySlug?.trim() ? { category: categorySlug.trim() } : {}),
  });
  const k = themeKey ?? "jewellery";
  const heading = translate(title?.trim() || (k === "electronics" ? "You may also like" : "Related products"), languageCode);
  const max = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.min(limit, 12) : 6;
  const slice = products.slice(0, max);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-xl font-semibold" style={{ color: "var(--theme-text)" }}>
        {heading}
      </h2>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {slice.map((p) => (
          <div key={p.slug} className="w-64 shrink-0">
            <ProductCard slug={p.slug} name={p.name} price={p.price} currency={p.currency} image={p.image ?? image} languageCode={languageCode} />
          </div>
        ))}
      </div>
    </section>
  );
}
