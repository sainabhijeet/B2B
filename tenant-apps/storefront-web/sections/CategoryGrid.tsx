import CategoryCard from "@/components/CategoryCard";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";
import { listCategories } from "@/services/categoryService";

type Props = {
  themeKey?: ThemeKey;
  image?: string;
  images?: string[];
  imageLeft?: string;
  imageCenter?: string;
  imageRight?: string;
  categories?: unknown;
  title?: string;
  subtitle?: string;
  languageCode?: string;
};

export default async function CategoryGrid({
  themeKey,
  image,
  images,
  imageLeft,
  imageCenter,
  imageRight,
  categories: configuredCategories,
  title,
  subtitle,
  languageCode,
}: Props) {
  const categories = await listCategories();
  const k = themeKey ?? "jewellery";
  /** Category list API has no image URL yet — optional hero from theme template only. */
  const cardImage = image || imageLeft || imageCenter || imageRight;
  const cardImages = Array.isArray(images) ? images.filter((item) => typeof item === "string" && item.trim()) : [];
  const configuredImages = Array.isArray(configuredCategories)
    ? configuredCategories.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return "";
        const value = (item as { image?: unknown }).image;
        return typeof value === "string" && value.trim() ? value : "";
      })
    : [];
  const heading = title?.trim() ?? "";
  const t = (text: string) => translate(text, languageCode);
  return (
    <section
      className="py-12"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 92%, white), color-mix(in srgb, var(--theme-secondary) 18%, white))",
      }}
      data-theme-key={k}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold" style={{ color: "var(--theme-text)" }}>
          {t(heading)}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--theme-muted)" }}>
          {t(subtitle?.trim() ?? "")}
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c, index) => (
            <CategoryCard
              key={c.slug}
              slug={c.slug}
              name={t(c.name)}
              description={t(c.description)}
              image={
                c.imageUrl ||
                configuredImages[index] ||
                (cardImages.length ? cardImages[index % cardImages.length] : undefined) ||
                cardImage
              }
              languageCode={languageCode}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
