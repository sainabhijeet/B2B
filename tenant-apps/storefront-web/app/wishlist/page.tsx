import type { Metadata } from "next";
import Link from "next/link";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import WishlistPageClient, { type WishlistItem } from "@/components/wishlist/WishlistPageClient";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import { translate } from "@/lib/translation-engine";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved products",
};

export default async function WishlistPage() {
  const [language, response] = await Promise.all([
    getStorefrontLanguage(),
    storefrontAuthedFetchReadOnly("/wishlist"),
  ]);
  const t = (value: string) => translate(value, language);

  if (response.status === 401 || response.status === 403) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <RefreshCustomerSession enabled={response.status === 401}>
          <main className="mx-auto max-w-lg px-4 py-16 text-center">
            <h1 className="text-xl font-semibold text-slate-900">{t("Wishlist")}</h1>
            <p className="mt-3 text-sm text-slate-600">{t("Sign in to see your saved products.")}</p>
            <Link href="/login?next=%2Fwishlist" className="mt-8 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">{t("Log in")}</Link>
          </main>
        </RefreshCustomerSession>
      </StorefrontLocaleFrame>
    );
  }

  if (!response.ok) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-slate-900">{t("Wishlist")}</h1>
          <p className="mt-3 text-sm text-red-700">{t("Could not load wishlist. Please try again.")}</p>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const payload = await response.json().catch(() => null) as { data?: { items?: WishlistItem[] } } | null;
  const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <WishlistPageClient initialItems={items} languageCode={language} />
    </StorefrontLocaleFrame>
  );
}
