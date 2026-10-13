import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ThemedContentPage from "@/components/ThemedContentPage";

const posts = [
  ["Buying Guide", "How to choose premium electronics without overpaying"],
  ["Seller Tips", "Improve product cards with better images, trust badges, and offers"],
  ["Trends", "What marketplace customers expect from fast checkout"],
];

export default async function BlogPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  const fallback = (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-950">{t("Commerce Blog")}</h1>
        <p className="mt-2 text-slate-600">{t("Guides for buyers, sellers, product discovery, and marketplace growth.")}</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {posts.map(([tag, title]) => (
            <article key={title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-700">{t(tag)}</span>
              <h2 className="mt-3 text-xl font-bold text-slate-950">{t(title)}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("Practical insights for premium multi-vendor ecommerce experiences.")}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
    </StorefrontLocaleFrame>
  );
  return <ThemedContentPage page="blog" fallback={fallback} />;
}
