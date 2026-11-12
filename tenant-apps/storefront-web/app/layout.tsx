import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Roboto } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/tokens.css";
import { createLanguageContext } from "@/lib/localization-service";
import { resolveStorefrontTheme, storefrontDisplayName } from "@/lib/resolve-storefront-theme";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import StorefrontHeaderVisibility from "@/components/StorefrontHeaderVisibility";
import StorefrontFooterVisibility from "@/components/StorefrontFooterVisibility";
import StorefrontNavigationLoader from "@/components/StorefrontNavigationLoader";
import StorefrontMotion from "@/components/StorefrontMotion";
import { loadHomeTemplateChain } from "@/engine/theme-loader";
import DemoCatalogNotice, { THEME_LIVE_PREVIEW_NOTICE } from "@/components/DemoCatalogNotice";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import { CustomerAuthProvider } from "@/components/auth/CustomerAuthContext";
import { listCategories } from "@/services/categoryService";
import { themePreviewCategories } from "@/lib/theme-preview-catalog";

const roboto = Roboto({
  variable: "--font-storefront-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const poppins = localFont({
  variable: "--font-storefront-poppins",
  display: "swap",
  src: [
    { path: "../../mobile-app/assets/fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../mobile-app/assets/fonts/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "../../mobile-app/assets/fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../mobile-app/assets/fonts/Poppins-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../mobile-app/assets/fonts/Poppins-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
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
  const explicitPreviewMode = requestHeaders.get("x-storefront-preview-mode") === "1";
  const layoutPreviewMode = explicitPreviewMode || Boolean(previewLanguage);
  // Always use the request-aware resolver here. Passing `undefined` selects
  // the React de-duplication path, which can retain the first tenant opened by
  // a long-running dev process and leak that tenant's header into another
  // tenant preview.
  const resolved = await resolveStorefrontTheme(null, layoutPreviewMode
    ? { previewMode: true, previewLanguageCode: previewLanguage }
    : {});
  const language = resolved.selectedLanguageCode;
  const direction = createLanguageContext(language).direction;
  const cookieStore = await cookies();
  const signedIn = Boolean(cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value);
  const branding = resolved.branding;
  const logoText = storefrontDisplayName(resolved);
  const logoImageUrl = branding?.logoUrl || branding?.logoDataUrl || undefined;
  const { template: homeTemplate } = await loadHomeTemplateChain(resolved);
  const headerSection = homeTemplate.sections.find((section) => {
    const type = String(section.type ?? section.component ?? section.id ?? "").trim().toLowerCase();
    return type === "header" || type === "header-basic" || type === "header-mega-menu";
  });
  const footerSection = homeTemplate.sections.find((section) => {
    const type = String(section.type ?? section.component ?? section.id ?? "").trim().toLowerCase();
    return type === "footer" || type === "footer-columns";
  });
  const headerSettings = headerSection?.settings ?? {};
  const footerSettings = footerSection?.settings ?? {};
  const configuredNav = Array.isArray(headerSettings.nav)
    ? headerSettings.nav.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : ["Home", "Categories", "About", "Blog", "FAQ", "Contact"];
  const themeCss = await loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tokenVarsCss = await loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides, resolved.branding);
  const rawDesignSystem = resolved.manifest?.designSystem;
  const designSystem = rawDesignSystem && typeof rawDesignSystem === "object" && !Array.isArray(rawDesignSystem)
    ? rawDesignSystem as Record<string, unknown>
    : null;
  const templateDesignId = typeof headerSettings.designId === "string" && headerSettings.designId.trim()
    ? headerSettings.designId.trim()
    : undefined;
  // Preview payloads can omit the manifest while still returning the resolved
  // theme template. Keep the theme's visual system active from its header
  // contract so scoped CSS, typography, and exclusive headers do not fall back
  // to the generic storefront shell.
  const designId = typeof designSystem?.id === "string" && designSystem.id.trim()
    ? designSystem.id.trim()
    : templateDesignId;
  const previewCategories = themePreviewCategories(resolved.previewCatalog);
  const headerCategories = previewCategories.length > 0 ? previewCategories : await listCategories();
  return (
    <html lang={language} dir={direction} suppressHydrationWarning>
      <body
        id="storefront-root-font"
        dir={direction}
        suppressHydrationWarning
        data-theme-layout={designId}
        data-catalog-presentation={resolved.catalogPresentation.mode.toLowerCase()}
        className={`${roboto.variable} ${poppins.variable} min-h-screen antialiased`}
      >
        {themeCss ? <style data-theme-runtime-css dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
        {tokenVarsCss ? <style data-theme-token-vars dangerouslySetInnerHTML={{ __html: tokenVarsCss }} /> : null}
        {tenantTokenCss ? <style data-tenant-token-vars dangerouslySetInnerHTML={{ __html: tenantTokenCss }} /> : null}
        <style data-storefront-font>{`body#storefront-root-font,body#storefront-root-font *{font-family:var(--font-storefront-roboto),Roboto,Arial,sans-serif!important}body#storefront-root-font[data-theme-layout="ds-11-web"],body#storefront-root-font[data-theme-layout="ds-11-web"] *,body#storefront-root-font[data-theme-layout="ds-12-web"],body#storefront-root-font[data-theme-layout="ds-12-web"] *,body#storefront-root-font[data-theme-layout="ds-14-web"],body#storefront-root-font[data-theme-layout="ds-14-web"] *,body#storefront-root-font[data-theme-layout="ds-15-web"],body#storefront-root-font[data-theme-layout="ds-15-web"] *{font-family:var(--font-storefront-poppins),Poppins,Arial,sans-serif!important}body#storefront-root-font[data-theme-layout="ds-12-web"] h1,body#storefront-root-font[data-theme-layout="ds-12-web"] h2,body#storefront-root-font[data-theme-layout="ds-12-web"] h3,body#storefront-root-font[data-theme-layout="ds-12-web"] .beauty-studio-brand-copy strong{font-family:Georgia,"Times New Roman",serif!important}`}</style>
        <CustomerAuthProvider signedIn={signedIn}>
          <StorefrontNavigationLoader />
          <StorefrontMotion designId={designId} />
          <StorefrontHeaderVisibility
            designId={designId}
            variant={headerSection?.variant}
            logoText={logoText}
            logoImageUrl={logoImageUrl}
            industryName={branding?.industryName || undefined}
            nav={configuredNav}
            categoryLinks={headerCategories.map((category) => ({
              slug: category.slug,
              name: category.name,
              description: category.description,
            }))}
            languageCode={language}
            primaryColor={branding?.primaryColor || undefined}
            secondaryColor={branding?.secondaryColor || undefined}
            signedIn={signedIn}
          />
          {layoutPreviewMode || resolved.catalogPresentation.mode === "DEMO" ? (
            <DemoCatalogNotice
              languageCode={language}
              notice={layoutPreviewMode ? THEME_LIVE_PREVIEW_NOTICE : resolved.catalogPresentation.notice}
            />
          ) : null}
          {children}
          <style data-storefront-image-overlay-policy>{`
            /* Keep every theme image surface clean: labels belong beside images, never on top of them. */
            :root body#storefront-root-font .theme-hero-media::before,
            :root body#storefront-root-font .theme-hero-media::after,
            :root body#storefront-root-font .product-card-media::before,
            :root body#storefront-root-font .product-card-media::after,
            :root body#storefront-root-font .category-card > a:first-child::before,
            :root body#storefront-root-font .category-card > a:first-child::after {
              display: none !important;
              content: none !important;
            }
            :root body#storefront-root-font .aurelia-hero-index,
            :root body#storefront-root-font .product-card-badge,
            :root body#storefront-root-font [data-image-overlay-label],
            :root body#storefront-root-font .theme-image-label,
            :root body#storefront-root-font .theme-media-label {
              display: none !important;
            }
          `}</style>
          <style data-storefront-uniform-product-cards>{`
            :root body#storefront-root-font[data-theme-layout] .theme-section-root[data-section-type="product-grid"] > section {
              box-sizing: border-box !important;
              width: 100% !important;
              max-width: 1440px !important;
              padding-inline: clamp(20px, 4vw, 64px) !important;
              padding-top: 68px !important;
              padding-bottom: 72px !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid {
              display: grid !important;
              width: min(100%, 1254px) !important;
              max-width: 1254px !important;
              margin-top: 34px !important;
              margin-inline: auto !important;
              grid-template-columns: repeat(auto-fit, var(--storefront-card-width, 300px)) !important;
              justify-content: var(--storefront-grid-justify, center) !important;
              align-items: stretch !important;
              gap: 18px !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card {
              box-sizing: border-box !important;
              width: var(--storefront-card-width, 300px) !important;
              height: var(--storefront-card-height, 476px) !important;
              min-height: var(--storefront-card-height, 476px) !important;
              max-height: var(--storefront-card-height, 476px) !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card > a {
              display: flex !important;
              width: 100% !important;
              height: 100% !important;
              min-height: 0 !important;
              grid-template-columns: none !important;
              flex-direction: column !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-media {
              width: 100% !important;
              height: var(--storefront-card-media-height, 268px) !important;
              min-height: var(--storefront-card-media-height, 268px) !important;
              max-height: var(--storefront-card-media-height, 268px) !important;
              aspect-ratio: auto !important;
              flex: 0 0 var(--storefront-card-media-height, 268px) !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-media img {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-body {
              box-sizing: border-box !important;
              min-height: 0 !important;
              overflow: hidden !important;
              flex: 1 1 auto !important;
              gap: 8px !important;
              padding: 16px !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-features {
              display: none !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-title {
              display: -webkit-box !important;
              overflow: hidden !important;
              font-size: 15px !important;
              line-height: 20px !important;
              -webkit-box-orient: vertical !important;
              -webkit-line-clamp: 2 !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-description {
              display: -webkit-box !important;
              overflow: hidden !important;
              font-size: 12px !important;
              line-height: 20px !important;
              -webkit-box-orient: vertical !important;
              -webkit-line-clamp: 2 !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-purchase {
              margin-top: auto !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-price {
              font-size: 18px !important;
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid .product-card-view {
              margin-top: 10px !important;
              font-size: 10px !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid {
              width: min(100%, 1312px) !important;
              max-width: 1312px !important;
              grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
              align-items: stretch !important;
              gap: 16px !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card {
              width: 100% !important;
              min-width: 0 !important;
              height: 468px !important;
              min-height: 468px !important;
              max-height: 468px !important;
              grid-column: span 3 !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(1) {
              height: 500px !important;
              min-height: 500px !important;
              max-height: 500px !important;
              grid-column: span 7 !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(2) {
              height: 500px !important;
              min-height: 500px !important;
              max-height: 500px !important;
              grid-column: span 5 !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(1) > a {
              display: grid !important;
              grid-template-columns: minmax(0, 1.08fr) minmax(260px, .92fr) !important;
              flex-direction: unset !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(1) .product-card-media {
              width: 100% !important;
              height: 100% !important;
              min-height: 100% !important;
              max-height: 100% !important;
              flex-basis: auto !important;
            }
            @media (max-width: 1050px) {
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card,
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(1),
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(2) {
                grid-column: span 1 !important;
                height: 468px !important;
                min-height: 468px !important;
                max-height: 468px !important;
              }
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(1) > a {
                display: flex !important;
                grid-template-columns: none !important;
                flex-direction: column !important;
              }
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card:nth-child(1) .product-card-media {
                height: var(--storefront-card-media-height, 250px) !important;
                min-height: var(--storefront-card-media-height, 250px) !important;
                max-height: var(--storefront-card-media-height, 250px) !important;
                flex-basis: var(--storefront-card-media-height, 250px) !important;
              }
            }
            @media (max-width: 560px) {
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .theme-section-root[data-section-variant="products-clinical-board"] .storefront-product-grid.storefront-product-grid.storefront-product-grid {
                grid-template-columns: minmax(0, 1fr) !important;
              }
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid {
              width: 100% !important;
              max-width: none !important;
              grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              justify-content: stretch !important;
              gap: 14px !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid > .product-card {
              width: 100% !important;
              height: 380px !important;
              min-height: 380px !important;
              max-height: 380px !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid > .product-card > a {
              display: flex !important;
              grid-template-columns: none !important;
              flex-direction: column !important;
            }
            :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid .product-card-media {
              width: 100% !important;
              height: 175px !important;
              min-height: 175px !important;
              max-height: 175px !important;
              flex-basis: 175px !important;
            }
            @media (max-width: 1250px) {
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              }
            }
            @media (max-width: 900px) {
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
            @media (max-width: 650px) {
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid {
                grid-template-columns: minmax(0, 1fr) !important;
              }
            }
            @media (max-width: 600px) {
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid > .product-card {
                height: 390px !important;
                min-height: 390px !important;
                max-height: 390px !important;
              }
              :root body#storefront-root-font[data-theme-layout="ds-11-web"] .storefront-category-page[data-plp-layout="clinical-register"] .category-product-grid.storefront-product-grid.storefront-product-grid .product-card-media {
                height: 170px !important;
                min-height: 170px !important;
                max-height: 170px !important;
                flex-basis: 170px !important;
              }
            }
            @media (max-width: 359px) {
              :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid {
                grid-template-columns: minmax(0, 1fr) !important;
              }
              :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid > .product-card {
                width: 100% !important;
              }
            }
            @media (max-width: 767px) {
              :root body#storefront-root-font[data-theme-layout] .theme-section-root[data-section-type="product-grid"] > section {
                padding-top: 48px !important;
                padding-bottom: 56px !important;
              }
              :root body#storefront-root-font[data-theme-layout] .storefront-product-grid.storefront-product-grid.storefront-product-grid {
                margin-top: 28px !important;
              }
            }
            :root body#storefront-root-font[data-theme-layout] .storefront-category-page .category-product-grid.storefront-product-grid {
              margin-top: 20px !important;
              margin-inline: 0 !important;
              justify-content: start !important;
            }
            @media (max-width: 767px) {
              :root body#storefront-root-font[data-theme-layout] .storefront-category-page .category-product-grid.storefront-product-grid {
                margin-top: 16px !important;
              }
            }
          `}</style>
          <StorefrontFooterVisibility
            {...footerSettings}
            variant={footerSection?.variant}
            logoText={logoText}
            logoImageUrl={logoImageUrl}
            industryName={branding?.industryName || undefined}
            tagline={branding?.tagline || undefined}
            languageCode={language}
          />
        </CustomerAuthProvider>
      </body>
    </html>
  );
}
