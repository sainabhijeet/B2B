import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ProductCard from "@/components/ProductCard";
import { translate } from "@/lib/translation-engine";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { listStorefrontProducts } from "@/services/productService";

type SearchParams = Promise<{ q?: string | string[] }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  const rawQuery = (await searchParams).q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const result = query ? await listStorefrontProducts({ q: query, limit: 60 }) : null;

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t("Search")}</h1>
        <form className="mt-6 flex gap-2">
          <input name="q" defaultValue={query} aria-label={t("Search products")} placeholder={t("Search products")} className="min-w-0 flex-1 rounded-lg border px-4 py-3" />
          <button className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">{t("Search")}</button>
        </form>
        {result ? (
          result.products.length ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">{t("Search results")}</h2>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {result.products.map((product) => (
                  <ProductCard key={product.slug} {...product} name={t(product.name)} languageCode={language} />
                ))}
              </div>
            </section>
          ) : (
            <p className="mt-8 text-slate-600">{t("No results found")}</p>
          )
        ) : null}
      </main>
    </StorefrontLocaleFrame>
  );
}
