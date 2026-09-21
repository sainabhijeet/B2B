import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { translate } from "@/lib/translation-engine";
import { getStorefrontLanguage } from "@/lib/storefront-language";

export default async function AccountPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">{t("Account")}</h1>
        <p className="mt-3 text-slate-600">{t("Sign in")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/login"
            className="inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white"
          >
            {t("Sign in")}
          </a>
          <a
            href="/account/delete"
            className="inline-flex rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700"
          >
            {t("Delete account")}
          </a>
        </div>
      </main>
    </StorefrontLocaleFrame>
  );
}
