import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";

const faqs = [
  ["How does delivery work?", "Orders are fulfilled by verified sellers and tracked from checkout to delivery."],
  ["Can sellers manage products?", "Yes, sellers can manage inventory, orders, payouts, and campaigns from the seller dashboard."],
  ["Is payment secure?", "The checkout flow is designed for secure payment review, address entry, and order confirmation."],
  ["How do returns work?", "Eligible items support replacement or return based on seller and category policy."],
];

export default async function FaqPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-950">{t("Frequently Asked Questions")}</h1>
        <div className="mt-8 space-y-4">
          {faqs.map(([q, a]) => (
            <article key={q} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">{t(q)}</h2>
              <p className="mt-2 leading-7 text-slate-600">{t(a)}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
    </StorefrontLocaleFrame>
  );
}
