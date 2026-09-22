import type { Metadata } from "next";
import StorefrontLoginForm from "@/components/auth/StorefrontLoginForm";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { getStorefrontLanguage } from "@/lib/storefront-language";

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
  const [languageCode, query] = await Promise.all([
    getStorefrontLanguage(),
    searchParams,
  ]);

  return (
    <StorefrontLocaleFrame
      languageCode={languageCode}
      className="theme-storefront"
    >
      <StorefrontLoginForm
        languageCode={languageCode}
        nextPath={safeNextPath(query.next)}
      />
    </StorefrontLocaleFrame>
  );
}
