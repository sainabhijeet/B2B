import type { Metadata } from "next";
import StorefrontLoginForm from "@/components/auth/StorefrontLoginForm";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import {
  resolveStorefrontTheme,
  storefrontDisplayName,
} from "@/lib/resolve-storefront-theme";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with your mobile number and OTP.",
};

type SearchParams = Promise<{ next?: string | string[] }>;

function safeNextPath(value: string | string[] | undefined): string {
  const candidate = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/login")
  ) {
    return "/orders";
  }
  return candidate;
}

export default async function StorefrontLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [resolved, query] = await Promise.all([
    resolveStorefrontTheme(),
    searchParams,
  ]);
  const branding = resolved.branding;
  const languageCode = resolved.selectedLanguageCode;

  return (
    <StorefrontLocaleFrame
      languageCode={languageCode}
      className="theme-storefront"
    >
      <StorefrontLoginForm
        languageCode={languageCode}
        nextPath={safeNextPath(query.next)}
        storeName={storefrontDisplayName(resolved)}
        logoImageUrl={branding?.logoUrl || branding?.logoDataUrl || undefined}
        tagline={branding?.tagline || undefined}
        primaryColor={branding?.primaryColor || undefined}
        secondaryColor={branding?.secondaryColor || undefined}
      />
    </StorefrontLocaleFrame>
  );
}
