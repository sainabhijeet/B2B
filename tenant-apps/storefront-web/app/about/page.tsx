import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { translate } from "@/lib/translation-engine";
import { getStorefrontLanguage } from "@/lib/storefront-language";

export default async function AboutPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  return <StorefrontLocaleFrame languageCode={language} className="theme-storefront"><main className="mx-auto max-w-4xl px-4 py-12"><h1 className="text-3xl font-bold">{t("About us")}</h1><p className="mt-4 leading-7 text-slate-600">{t("About our marketplace")}</p></main></StorefrontLocaleFrame>;
}
