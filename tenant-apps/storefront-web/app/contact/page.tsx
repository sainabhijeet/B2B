import ContactForm from "@/components/contact/ContactForm";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ThemedContentPage from "@/components/ThemedContentPage";
import { resolveStorefrontTheme, storefrontDisplayName } from "@/lib/resolve-storefront-theme";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";

export default async function ContactPage() {
  const [language, resolved] = await Promise.all([
    getStorefrontLanguage(),
    resolveStorefrontTheme(),
  ]);
  const t = (text: string) => translate(text, language);
  const storeName = storefrontDisplayName(resolved);
  const isCoatCraftTheme = resolved.storefrontKey === "paints-coatings-adhesives-web-theme";
  const isMaterialBridgeTheme = resolved.storefrontKey === "chemicals-specialty-materials-web-theme";

  if (isMaterialBridgeTheme) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <ContactForm languageCode={language} storeName={storeName} variant="materialbridge" />
      </StorefrontLocaleFrame>
    );
  }

  if (isCoatCraftTheme) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <ContactForm languageCode={language} storeName={storeName} variant="coatcraft" />
      </StorefrontLocaleFrame>
    );
  }

  const fallback = (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="relative overflow-hidden bg-slate-950 px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
          <div className="absolute -right-24 -top-36 h-80 w-80 rounded-full border border-white/10" />
          <div className="relative max-w-3xl">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-secondary)]">{t("Buyer support")}</p>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl lg:text-5xl">{t("How can our team help?")}</h1>
            <p className="mt-5 max-w-2xl leading-8 text-slate-300">{t("Get help with products, bulk requirements, account access, orders, delivery and partnerships. Share the relevant details and our support team can review your request.")}</p>
          </div>
          <div className="relative mt-9 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-3">
            {["Product and order help", "Bulk buying enquiries", "Account and payment support"].map((item, index) => (
              <div key={item} className="bg-slate-950/80 px-5 py-4 text-sm font-bold"><span className="mr-3 text-[var(--theme-secondary)]">0{index + 1}</span>{t(item)}</div>
            ))}
          </div>
        </div>
      </section>
    </StorefrontLocaleFrame>
  );

  return (
    <>
      <ThemedContentPage page="contact" fallback={fallback} />
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <ContactForm languageCode={language} storeName={storeName} />
      </StorefrontLocaleFrame>
    </>
  );
}
