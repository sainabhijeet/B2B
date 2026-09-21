import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/tokens.css";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { resolveActiveLanguage } from "@/lib/language-consistency";
import { createLanguageContext } from "@/lib/localization-service";

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
  const language = previewLanguage ? resolveActiveLanguage(previewLanguage) : await getStorefrontLanguage();
  const direction = createLanguageContext(language).direction;
  return (
    <html lang={language} dir={direction} suppressHydrationWarning>
      <body dir={direction} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
