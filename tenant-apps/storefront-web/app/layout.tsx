import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/tokens.css";
import { createLanguageContext } from "@/lib/localization-service";
import { resolveStorefrontTheme } from "@/lib/resolve-storefront-theme";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import StorefrontHeaderVisibility from "@/components/StorefrontHeaderVisibility";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Storefront",
    template: "%s · Storefront",
  },
  description: "Next.js theme engine — JSON templates + section registry",
};

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
  const logoText = resolved.webTheme?.themeName?.trim() || branding?.industryName?.trim() || "Storefront";
  const logoImageUrl = branding?.logoUrl || branding?.logoDataUrl || undefined;
  return (
    <html lang={language} dir={direction} suppressHydrationWarning>
      <body dir={direction} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <StorefrontHeaderVisibility
          logoText={logoText}
          logoImageUrl={logoImageUrl}
          industryName={branding?.industryName || undefined}
          nav={["Home", "Categories", "Products", "About", "Blog", "FAQ", "Contact"]}
          languageCode={language}
          primaryColor={branding?.primaryColor || undefined}
          secondaryColor={branding?.secondaryColor || undefined}
          signedIn={signedIn}
        />
        {children}
      </body>
    </html>
  );
}
