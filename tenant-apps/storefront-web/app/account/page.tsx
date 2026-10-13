import Link from "next/link";
import AccountDashboardClient from "@/components/account/AccountDashboardClient";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { backendOriginFromApiUrl } from "@/lib/api-origin";
import type { ApiEnvelope, CustomerProfile } from "@/lib/account-types";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import { getStorefrontFeatureConfig } from "@/services/storefrontAppConfigService";

function absoluteProfileImageUrl(value: string | null | undefined): string | null {
  const url = value?.trim() ?? "";
  if (!url) return null;
  if (/^(?:https?:)?\/\//iu.test(url) || url.startsWith("data:")) return url;
  return `${backendOriginFromApiUrl().replace(/\/*$/u, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default async function AccountPage() {
  const [language, response, featureConfig] = await Promise.all([
    getStorefrontLanguage(),
    storefrontAuthedFetchReadOnly("/storefront/customer/me"),
    getStorefrontFeatureConfig(),
  ]);
  const t = (text: string) => translate(text, language);

  if (response.status === 401 || response.status === 403) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <RefreshCustomerSession enabled={response.status === 401}>
          <main className="min-h-[55vh] bg-slate-50 px-4 py-16">
            <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--theme-primary)]/10 text-2xl font-black text-[var(--theme-primary)]" aria-hidden="true">A</span>
              <h1 className="mt-5 text-2xl font-bold text-slate-950">{t("Your account")}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("Sign in with your registered mobile number to view your profile, credit and saved addresses.")}</p>
              <Link href="/login?next=%2Faccount" className="mt-7 inline-flex rounded-xl bg-[var(--theme-primary)] px-6 py-3 text-sm font-bold text-white transition hover:brightness-95">{t("Sign in")}</Link>
            </div>
          </main>
        </RefreshCustomerSession>
      </StorefrontLocaleFrame>
    );
  }

  if (!response.ok) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="mx-auto min-h-[55vh] max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-950">{t("Your account")}</h1>
          <p className="mt-3 text-sm text-red-700">{t("Could not load your account details. Please try again.")} ({response.status})</p>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<CustomerProfile> | null;
  const profile = payload?.data;
  if (!profile) {
    return (
      <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
        <main className="mx-auto min-h-[55vh] max-w-lg px-4 py-16 text-center text-red-700">{t("Customer profile response is invalid.")}</main>
      </StorefrontLocaleFrame>
    );
  }

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <AccountDashboardClient
        initialProfile={{
          ...profile,
          profileImageUrl: absoluteProfileImageUrl(profile.profileImageUrl),
          addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
        }}
        languageCode={language}
        creditViewEnabled={featureConfig.creditViewEnabled}
      />
    </StorefrontLocaleFrame>
  );
}
