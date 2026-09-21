import ProductCard from "@/components/ProductCard";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";
import { listProducts } from "@/services/productService";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  subtitle?: string;
  image?: string;
  images?: string[];
  imageLeft?: string;
  imageCenter?: string;
  imageRight?: string;
  /** When set, loads `GET /storefront/products?category=<slug>` (tenant catalogue). */
  categorySlug?: string;
  languageCode?: string;
};

export default async function ProductGrid({
  themeKey,
  title,
  subtitle,
  image,
  images,
  imageLeft,
  imageCenter,
  imageRight,
  categorySlug,
  languageCode,
}: Props) {
  const products = await listProducts({
    limit: 72,
    ...(categorySlug?.trim() ? { category: categorySlug.trim() } : {}),
  });
  const k = themeKey ?? "jewellery";
  const cardImage = image || imageCenter || imageLeft || imageRight;
  const cardImages = Array.isArray(images) ? images.filter((item) => typeof item === "string" && item.trim()) : [];
  const heading = title?.trim() ?? "";
  const sub = subtitle?.trim() ?? "";
  const t = (text: string) => translate(text, languageCode);
  return (
    <section
      className="mx-auto max-w-6xl px-4 py-12"
      style={{ background: "color-mix(in srgb, var(--theme-surface) 92%, transparent)" }}
      data-theme-key={k}
    >
      <h2 className="text-2xl font-bold" style={{ color: "var(--theme-text)" }}>
        {t(heading)}
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--theme-muted)" }}>
        {t(sub)}
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, index) => (
          <ProductCard
            key={p.slug}
            slug={p.slug}
            name={t(p.name)}
            price={p.price}
            currency={p.currency}
            image={p.image ?? cardImages[index % cardImages.length] ?? cardImage}
            languageCode={languageCode}
          />
        ))}
      </div>
    </section>
  );
}
