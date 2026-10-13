import ContactForm from "@/components/contact/ContactForm";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ThemedContentPage from "@/components/ThemedContentPage";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";

export default async function ContactPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  const fallback = (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <h1 className="text-3xl font-bold text-slate-950">{t("Contact Support")}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t("Our team is ready to help with products, orders, and partnerships.")}</p>
      </section>
    </StorefrontLocaleFrame>
  );

  return (
    <>
      <ThemedContentPage page="contact" fallback={fallback} />
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <ContactForm languageCode={language} />
      </StorefrontLocaleFrame>
    </>
  );
}
