import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/tokens.css";
import { createLanguageContext } from "@/lib/localization-service";
import { resolveStorefrontTheme, storefrontDisplayName } from "@/lib/resolve-storefront-theme";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import StorefrontHeaderVisibility from "@/components/StorefrontHeaderVisibility";
import StorefrontFooterVisibility from "@/components/StorefrontFooterVisibility";
import StorefrontNavigationLoader from "@/components/StorefrontNavigationLoader";
import { loadHomeTemplateChain } from "@/engine/theme-loader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveStorefrontTheme();
  const storeName = storefrontDisplayName(resolved);
  return {
    title: {
      default: storeName,
      template: `%s · ${storeName}`,
    },
    description: resolved.branding?.tagline?.trim() || `${storeName} online storefront`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const previewLanguage = requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, previewLanguage
    ? { previewMode: true, previewLanguageCode: previewLanguage }
    : undefined);
  const language = resolved.selectedLanguageCode;
  const direction = createLanguageContext(language).direction;
  const cookieStore = await cookies();
  const signedIn = Boolean(cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value);
  const branding = resolved.branding;
  const logoText = storefrontDisplayName(resolved);
  const logoImageUrl = branding?.logoUrl || branding?.logoDataUrl || undefined;
  const { template: homeTemplate } = await loadHomeTemplateChain(resolved);
  const footerSection = homeTemplate.sections.find((section) => {
    const type = String(section.type ?? section.component ?? section.id ?? "").trim().toLowerCase();
    return type === "footer" || type === "footer-columns";
  });
  const footerSettings = footerSection?.settings ?? {};
  return (
    <html lang={language} dir={direction} suppressHydrationWarning>
      <body dir={direction} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <StorefrontNavigationLoader />
        <StorefrontHeaderVisibility
          logoText={logoText}
          logoImageUrl={logoImageUrl}
          industryName={branding?.industryName || undefined}
          nav={["Home", "Categories", "About", "Blog", "FAQ", "Contact"]}
          languageCode={language}
          primaryColor={branding?.primaryColor || undefined}
          secondaryColor={branding?.secondaryColor || undefined}
          signedIn={signedIn}
        />
        {children}
        <StorefrontFooterVisibility
          {...footerSettings}
          logoText={logoText}
          logoImageUrl={logoImageUrl}
          industryName={branding?.industryName || undefined}
          tagline={branding?.tagline || undefined}
          languageCode={language}
        />
      </body>
    </html>
  );
}
