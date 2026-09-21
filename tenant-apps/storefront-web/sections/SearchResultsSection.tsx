import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";
import ProductCard from "@/components/ProductCard";
import { listProducts } from "@/services/productService";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  query?: string;
};

export default async function SearchResultsSection({ title, query, languageCode }: Props & { languageCode?: string }) {
  const t = (text: string) => translate(text, languageCode);
  const q = query?.trim() || "";
  const products = q ? await listProducts({ q, limit: 60 }) : [];
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">
        {title?.trim() || t("Search results")}
        {q ? <span className="ml-2 font-normal text-slate-500">{t("for “")}{q}”</span> : null}
      </h1>
      {products.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} {...product} name={t(product.name)} languageCode={languageCode} />
          ))}
        </div>
      ) : <p className="mt-4 text-sm text-slate-600">{t("No results found")}</p>}
    </section>
  );
}
