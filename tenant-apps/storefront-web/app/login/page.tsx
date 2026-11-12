import type { Metadata } from "next";
import StorefrontLoginForm from "@/components/auth/StorefrontLoginForm";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import {
  resolveStorefrontTheme,
  storefrontDisplayName,
} from "@/lib/resolve-storefront-theme";
import { safeCustomerNextPath } from "@/lib/customer-login-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with your mobile number and OTP.",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function StorefrontLoginPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const resolved = await resolveStorefrontTheme();
  const branding = resolved.branding;
  const languageCode = resolved.selectedLanguageCode;

  return (
    <StorefrontLocaleFrame
      languageCode={languageCode}
      className="theme-storefront"
    >
      <StorefrontLoginForm
        languageCode={languageCode}
        nextPath={safeCustomerNextPath(rawNext, "/orders")}
        storeName={storefrontDisplayName(resolved)}
        logoImageUrl={branding?.logoUrl || branding?.logoDataUrl || undefined}
        tagline={branding?.tagline || undefined}
        primaryColor={branding?.primaryColor || undefined}
        secondaryColor={branding?.secondaryColor || undefined}
      />
    </StorefrontLocaleFrame>
  );
}
