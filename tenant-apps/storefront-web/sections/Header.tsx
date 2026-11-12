import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import MiniCart from "@/components/cart/MiniCart";
import WishlistHeaderLink from "@/components/wishlist/WishlistHeaderLink";
import AureliaCollectionsMenu from "@/components/navigation/AureliaCollectionsMenu";
import StorefrontCategoryMenu from "@/components/navigation/StorefrontCategoryMenu";
import CoatingSystemSearch from "@/components/search/CoatingSystemSearch";
import UniversalHeaderSearch, { type UniversalSearchSuggestion } from "@/components/search/UniversalHeaderSearch";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";
import { customerLoginHref, customerLoginHrefWithCurrentContext, storefrontHrefWithCurrentContext } from "@/lib/customer-login-redirect";

type Props = {
  themeKey?: ThemeKey;
  designId?: string;
  variant?: string;
  logoText?: string;
  /** Injected from `tenant_branding` via `GET /themes/storefront/current`. */
  logoImageUrl?: string;
  industryName?: string;
  nav?: string[];
  categoryLinks?: Array<{
    slug: string;
    name: string;
    description?: string;
  }>;
  languageCode?: string;
  primaryColor?: string;
  secondaryColor?: string;
  signedIn?: boolean;
  currentPath?: string;
} & Record<string, unknown>;

const DEFAULT_NAV = ["Home", "Categories", "Brands", "New Arrivals", "Deals", "Blog", "About", "Contact"];

const AURELIA_COLLECTION_LINKS = [
  { label: "Sculptural rings", href: "/category/gold-jewelry" },
  { label: "Luminous necklaces", href: "/category/diamond-jewelry" },
  { label: "Modern earrings", href: "/category/silver-articles" },
  { label: "View the full edit", href: "/category" },
];

const CIRCUITLANE_COLLECTION_LINKS = [
  { label: "Mobile devices", href: "/category/mobile-phones" },
  { label: "Business computing", href: "/category/computers" },
  { label: "Audio systems", href: "/category/audio-video" },
  { label: "Connectivity & power", href: "/category/electronic-accessories" },
];

function hrefForNavLabel(label: string, languageCode?: string): string {
  const l = label.toLowerCase();
  const candidates = {
    home: ["home", translate("Home", languageCode)],
    category: ["categor", translate("Categories", languageCode)],
    newArrivals: ["new arrival", translate("New Arrivals", languageCode)],
    deals: ["deal", "offer", "sale", translate("Deals", languageCode)],
    brand: ["brand", translate("Brands", languageCode)],
    product: ["product", "catalog", "shop", translate("Products", languageCode), translate("Catalog", languageCode)],
    wishlist: ["wishlist", "favorite", translate("Wishlist", languageCode)],
    cart: ["cart", "basket", translate("Cart", languageCode)],
    orders: ["order", translate("Orders", languageCode)],
    account: ["account", "profile", translate("Account", languageCode)],
    login: ["login", "log in", "sign in", translate("Login", languageCode), translate("Log in", languageCode)],
    about: ["about", translate("About", languageCode)],
    blog: ["blog", "article", translate("Blog", languageCode)],
    faq: ["faq", "help", translate("FAQ", languageCode)],
    contact: ["contact", "support", translate("Contact", languageCode), translate("Support", languageCode)],
    bulkOrders: ["bulk order", "bulk enquiry", "request quote"],
    shipping: ["shipping", "delivery information"],
    returns: ["return", "refund"],
    privacy: ["privacy"],
    terms: ["terms", "condition"],
    cancellations: ["cancellation", "cancel policy"],
    cookies: ["cookie"],
    buyingGuide: ["buying guide", "buyer guide"],
  };
  const has = (values: string[]) => values.some((value) => value && l.includes(value.toLowerCase()));
  if (has(candidates.home)) return "/";
  if (has(candidates.category)) return "/category";
  if (has(candidates.newArrivals)) return "/category?sort=newest";
  if (has(candidates.deals)) return "/offers";
  if (has(candidates.brand)) return "/category";
  if (has(candidates.product)) return "/category";
  if (has(candidates.wishlist)) return "/wishlist";
  if (has(candidates.cart)) return "/cart";
  if (has(candidates.orders)) return "/orders";
  if (has(candidates.account)) return "/account";
  if (has(candidates.login)) return "/login";
  if (has(candidates.about)) return "/about";
  if (has(candidates.blog)) return "/blog";
  if (has(candidates.bulkOrders)) return "/bulk-orders";
  if (has(candidates.shipping)) return "/shipping";
  if (has(candidates.returns)) return "/returns";
  if (has(candidates.privacy)) return "/privacy";
  if (has(candidates.terms)) return "/terms";
  if (has(candidates.cancellations)) return "/cancellations";
  if (has(candidates.cookies)) return "/cookies";
  if (has(candidates.buyingGuide)) return "/buying-guide";
  if (has(candidates.faq)) return "/faq";
  if (has(candidates.contact)) return "/contact";
  return "/";
}

function cssColor(value: string | undefined, fallback: string): string {
  const color = typeof value === "string" ? value.trim() : "";
  return color || fallback;
}

function HeaderIcon({ children }: { children: ReactNode }) {
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-950" aria-hidden="true">{children}</span>;
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-7 w-7">
      <circle cx="12" cy="7.25" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 21c.45-4.2 3.08-6.5 7.25-6.5s6.8 2.3 7.25 6.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SearchForm({
  t,
  industryName,
  suggestions = [],
  mobile = false,
  compactLuxury = false,
  textileAtelier = false,
}: {
  t: (text: string) => string;
  industryName?: string;
  suggestions?: UniversalSearchSuggestion[];
  mobile?: boolean;
  compactLuxury?: boolean;
  textileAtelier?: boolean;
}) {
  const translatedIndustry = industryName ? t(industryName) : t("Products");
  const searchSuggestions = suggestions.length > 0
    ? suggestions.map((entry) => ({ ...entry, label: t(entry.label), description: t(entry.description) }))
    : [
        { label: t("Browse all products"), description: `${translatedIndustry} · ${t("Complete catalog")}`, href: "/category" },
        { label: t("New arrivals"), description: t("Recently added products and collections"), href: "/category?sort=newest" },
        { label: t("Popular products"), description: t("Frequently sourced products for business buyers"), href: "/category?sort=popular" },
        { label: t("Bulk order products"), description: t("Products available for quantity enquiries"), href: "/bulk-orders" },
      ];
  const outerClassName = `${mobile ? "storefront-search-form storefront-search-form-mobile flex w-full" : "storefront-search-form hidden min-w-0 flex-1 md:flex"} ${compactLuxury ? "storefront-search-form-footwear" : ""} ${textileAtelier ? "storefront-search-form-textile" : ""}`;

  return (
    <UniversalHeaderSearch
      inputId={mobile ? "mobile-store-search" : "desktop-store-search"}
      outerClassName={outerClassName}
      placeholder={t(compactLuxury ? "Search the collection..." : textileAtelier ? "Search fabrics, finishes and collections..." : "Search products, brands and more...")}
      searchLabel={t("Search products")}
      buttonLabel={t("Search")}
      suggestions={searchSuggestions}
      heading={t("Suggested categories")}
      hint={t("Choose a category or continue typing")}
      footerLabel={t("Browse the complete catalog")}
      emptyLabel={t("Search the complete catalog")}
      mobile={mobile}
      compactLuxury={compactLuxury}
      showCategory
      categoryLabel={t("Category")}
      allCategoriesLabel={t("All Categories")}
      industryName={translatedIndustry}
    />
  );
}

export default function Header({
  designId,
  variant,
  logoText,
  logoImageUrl,
  industryName,
  nav,
  categoryLinks,
  languageCode,
  primaryColor,
  secondaryColor,
  signedIn = false,
  currentPath = "/",
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const headerPrimary = cssColor(primaryColor, "#f97300");
  const headerSecondary = cssColor(secondaryColor, "#ffb24a");
  const isAtelierHeader = variant === "editorial-jowenly";
  const isCircuitIndustrial = designId === "ds-01-web";
  const isFootwearAtelier = designId === "ds-02-web";
  const isTextileAtelier = designId === "ds-03-web" || variant === "textile-atelier";
  const isPlantWorksControl = designId === "ds-04-web" || variant === "plant-ops";
  const isMachineryCommand = designId === "ds-05-web" || variant === "machinery-command" || variant === "machinery-index";
  const isMarketDesk = designId === "ds-07-web" || variant === "market-desk";
  const isGaragePro = designId === "ds-08-web" || variant === "garage-pro" || variant === "pitlane-command";
  const isPantryShelfDesk = designId === "ds-09-web" || variant === "pantry-shelf-desk" || variant === "pantry-route-command";
  const isCareLedgerDesk = designId === "ds-10-web" || variant === "care-ledger-desk";
  const isClinicalNavigator = designId === "ds-11-web" || variant === "clinical-navigator";
  const isBeautyStudio = designId === "ds-12-web" || variant === "beauty-studio";
  const isFieldLedger = designId === "ds-13-web" || variant === "field-ledger";
  const isQuarryCommand = designId === "ds-14-web" || variant === "quarry-command";
  const isCoatingLab = designId === "ds-15-web" || variant === "coating-lab";
  const isMaterialSpec = designId === "ds-16-web" || variant === "material-orbit-console";
  const isPolymerExchange = designId === "ds-17-web" || variant === "polymer-spec-desk";
  const labels = Array.isArray(nav) && nav.length > 0 ? nav : DEFAULT_NAV;
  const productNavLabels = new Set(
    ["Product", "Products", translate("Product", languageCode), translate("Products", languageCode)]
      .map((label) => label.trim().toLocaleLowerCase()),
  );
  const links = labels
    .map((label) => {
      const href = hrefForNavLabel(String(label), languageCode);
      const protectedWishlist = href === "/wishlist" && !signedIn;
      return { label: String(label), href: protectedWishlist ? customerLoginHref("/wishlist") : href, protectedWishlist };
    })
    .filter((item) =>
      (isTextileAtelier || item.href !== "/cart")
      && (isMarketDesk || isGaragePro || isPantryShelfDesk || isCareLedgerDesk || isClinicalNavigator || isFieldLedger || !productNavLabels.has(item.label.trim().toLocaleLowerCase())),
    );
  const brandName = logoText?.trim() || industryName?.trim() || t("Storefront");
  const brandCaption = industryName?.trim() && industryName.trim() !== brandName ? t(industryName.trim()) : "";
  const headerCategoryLinks = (Array.isArray(categoryLinks) ? categoryLinks : [])
    .filter((entry) => entry && entry.slug?.trim() && entry.name?.trim())
    .slice(0, 10)
    .map((entry) => ({
      label: entry.name.trim(),
      href: `/category/${encodeURIComponent(entry.slug.trim())}`,
      description: entry.description?.trim() || t("Explore collection"),
    }));
  const visibleCategoryLinks = headerCategoryLinks.length > 0
    ? headerCategoryLinks
    : (isCircuitIndustrial ? CIRCUITLANE_COLLECTION_LINKS.map((entry) => ({ ...entry, description: t("Explore collection") })) : []);
  const matchingLinkIndexes = links
    .map((item, index) => ({ index, path: item.href.split("?")[0], label: item.label.toLowerCase() }))
    .filter((item) => item.path === "/" ? currentPath === "/" : currentPath === item.path || currentPath.startsWith(`${item.path}/`));
  const currentSegment = currentPath.split("/").filter(Boolean)[0]?.toLowerCase() ?? "home";
  const activeLinkIndex = matchingLinkIndexes.find((item) => item.label.includes(currentSegment))?.index
    ?? matchingLinkIndexes[0]?.index
    ?? -1;
  const headerStyle = {
    "--header-primary": headerPrimary,
    "--header-secondary": headerSecondary,
    "--header-soft": `color-mix(in srgb, ${headerPrimary} 9%, white)`,
  } as CSSProperties;

  if (isPolymerExchange) {
    const configuredPolymerNav = links.filter((item) =>
      item.href !== "/login"
      && item.href !== "/account"
      && item.href !== "/cart"
      && !item.label.toLowerCase().includes("categor"),
    );
    const polymerNavDefaults = [
      { label: "Home", href: "/" },
      { label: "Catalog", href: "/category" },
      { label: "Offers", href: "/offers" },
      { label: "Buying Guide", href: "/buying-guide" },
      { label: "Bulk Orders", href: "/bulk-orders" },
      { label: "Contact", href: "/contact" },
    ];
    const configuredPolymerHrefs = new Set(configuredPolymerNav.map((item) => item.href.split("?")[0]));
    const polymerNavLinks = [
      ...configuredPolymerNav,
      ...polymerNavDefaults.filter((item) => !configuredPolymerHrefs.has(item.href)),
    ].slice(0, 6);
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");
    const translatedCategories = visibleCategoryLinks.map((entry) => ({
      ...entry,
      label: t(entry.label),
      description: t(entry.description),
    }));

    return (
      <header
        className="storefront-header polymer-exchange-header sticky top-0 z-[100]"
        data-header-variant="polymer-spec-desk"
        data-theme-design={designId}
        style={headerStyle}
      >
        <div className="polymer-exchange-signal">
          <p><span>{t("POLYMER EXCHANGE / 17")}</span><i aria-hidden="true" />{t("Resin, compound and masterbatch sourcing")}</p>
          <p>{t("Trade desk open")}<b aria-hidden="true" /></p>
        </div>

        <div className="polymer-exchange-shell">
          <Link href="/" className="polymer-exchange-brand" aria-label={`${brandName} ${t("Home")}`}>
            <span className="polymer-exchange-mark" aria-hidden="true">
              {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoImageUrl.trim()} alt="" />
              ) : (
                <strong>{brandName.slice(0, 2).toUpperCase()}</strong>
              )}
              <i /><i /><i /><i /><i />
            </span>
            <span className="polymer-exchange-brand-copy">
              <small>{t("MATERIAL SOURCE NETWORK")}</small>
              <strong>{brandName}</strong>
              <em>{brandCaption || t("Plastics & Polymers")}</em>
            </span>
          </Link>

          <div className="polymer-exchange-workspace">
            <div className="polymer-exchange-route">
              <nav aria-label={t("Main navigation")}>
                {polymerNavLinks.map((item, index) => {
                  const path = item.href.split("?")[0];
                  const active = path === "/" ? currentPath === "/" : currentPath === path || currentPath.startsWith(`${path}/`);
                  return (
                    <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={active ? "is-active" : ""}>
                      {t(item.label)}
                    </Link>
                  );
                })}
              </nav>
              <Link href="/contact" className="polymer-exchange-specialist">{t("Material desk")} <span aria-hidden="true">&#8599;</span></Link>
            </div>

            <div className="polymer-exchange-discovery">
              <div className="polymer-exchange-category">
                <StorefrontCategoryMenu
                  label={t("Material families")}
                  href="/category"
                  active={categoryIsActive}
                  title={t("Source by polymer family")}
                  subtitle={t("Compare resins, masterbatches, engineering polymers and recycled feedstock")}
                  viewAllLabel={t("Open the full material index")}
                  entries={translatedCategories}
                  emptyLabel={t("Browse all materials")}
                />
              </div>
              <UniversalHeaderSearch
                inputId="polymer-exchange-search"
                outerClassName="polymer-exchange-search"
                placeholder={t("Search polymer, grade, application or SKU")}
                searchLabel={t("Search the polymer catalog")}
                buttonLabel={t("Search")}
                suggestions={(translatedCategories.length > 0 ? translatedCategories : [
                  { label: t("Polymer resins"), description: t("PP, PE, PVC and process-ready materials"), href: "/search?q=polymer%20resins" },
                  { label: t("Masterbatches"), description: t("Colour, additive and performance concentrates"), href: "/search?q=masterbatch" },
                  { label: t("Engineering plastics"), description: t("ABS, nylon and application-led materials"), href: "/search?q=engineering%20plastics" },
                  { label: t("Recycled materials"), description: t("Recovered polymer feedstock by format"), href: "/search?q=recycled%20polymer" },
                ])}
                heading={t("Polymer groups")}
                hint={t("Choose a family or continue typing")}
                footerLabel={t("Open the complete polymer catalog")}
                emptyLabel={t("Search the complete catalog")}
              />
            </div>
          </div>

          <aside className="polymer-exchange-tools" aria-label={t("Buyer tools")}>
            <Link href={signedIn ? "/account" : "/login"} className="polymer-exchange-account">
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><small>{t("Trade account")}</small><strong>{signedIn ? t("My account") : t("Sign in")}</strong></span>
            </Link>
            <span className="polymer-exchange-icon polymer-exchange-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
            <span className="polymer-exchange-icon polymer-exchange-cart"><MiniCart languageCode={languageCode} directNavigation iconOnly /></span>
            <Link href="/bulk-orders" className="polymer-exchange-rfq"><span>{t("RFQ / BULK")}</span><strong>{t("Build a sourcing brief")}</strong><b aria-hidden="true">&#8594;</b></Link>
            <details className="polymer-exchange-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /><span>{t("Menu")}</span></summary>
              <nav aria-label={t("Mobile navigation")}>
                <Link href="/category">{t("Browse all materials")}</Link>
                {polymerNavLinks.map((item, index) => <Link key={`${item.href}-${index}`} href={item.href}>{t(item.label)}</Link>)}
                <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                <Link href="/bulk-orders">{t("Build an RFQ")}</Link>
              </nav>
            </details>
          </aside>
        </div>

        <div className="polymer-exchange-index" aria-label={t("Material index shortcuts")}>
          <span>{t("SOURCE BY FAMILY")}</span>
          <Link href="/search?q=polypropylene">POLYPROPYLENE</Link>
          <Link href="/search?q=polyethylene">POLYETHYLENE</Link>
          <Link href="/search?q=abs">ACRYLONITRILE BUTADIENE STYRENE</Link>
          <Link href="/search?q=pet">POLYETHYLENE TEREPHTHALATE</Link>
          <Link href="/search?q=masterbatch">MASTERBATCH</Link>
          <Link href="/search?q=recycled%20polymer">RECYCLED</Link>
          <p>
            <span>{t("MOQ & volume tiers")}</span>
            <i aria-hidden="true" />
            <span>{t("Application-led sourcing")}</span>
          </p>
        </div>
      </header>
    );
  }

  if (isMaterialSpec) {
    const configuredMaterialNav = links.filter((item) =>
      item.href !== "/login"
      && item.href !== "/account"
      && item.href !== "/cart"
      && !item.label.toLowerCase().includes("categor"),
    );
    const materialNavDefaults = [
      { label: "Home", href: "/" },
      { label: "Catalog", href: "/category" },
      { label: "Offers", href: "/offers" },
      { label: "Buying Guide", href: "/buying-guide" },
      { label: "Bulk Orders", href: "/bulk-orders" },
      { label: "Contact", href: "/contact" },
    ];
    const configuredMaterialHrefs = new Set(configuredMaterialNav.map((item) => item.href.split("?")[0]));
    const materialNavLinks = [
      ...configuredMaterialNav,
      ...materialNavDefaults.filter((item) => !configuredMaterialHrefs.has(item.href)),
    ].slice(0, 6);
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");

    return (
      <header
        className="storefront-header material-orbit-header sticky top-0 z-[100]"
        data-header-variant="material-orbit-console"
        data-theme-design={designId}
        style={headerStyle}
      >
        <div className="material-orbit-shell">
          <Link href="/" className="material-orbit-brand" aria-label={`${brandName} ${t("Home")}`}>
            <span className="material-orbit-symbol" aria-hidden="true">
              {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoImageUrl.trim()} alt="" />
              ) : (
                <strong>{brandName.slice(0, 2).toUpperCase()}</strong>
              )}
              <i /><i /><i /><b /><b />
            </span>
            <span className="material-orbit-brand-copy">
              <small>{t("CHEMISTRY SOURCE / 16")}</small>
              <strong>{brandName}</strong>
              <em>{brandCaption || t("Chemicals & specialty materials")}</em>
            </span>
            <span className="material-orbit-brand-code" aria-hidden="true">MB<br />16</span>
          </Link>

          <div className="material-orbit-workspace">
            <div className="material-orbit-route">
              <p><span>{t("LIVE MATERIAL DESK")}</span><i aria-hidden="true" />{t("Samples · MOQ · volume tiers")}</p>
              <nav aria-label={t("Main navigation")}>
              {materialNavLinks.map((item, index) => {
                const path = item.href.split("?")[0];
                const active = path === "/" ? currentPath === "/" : currentPath === path || currentPath.startsWith(`${path}/`);
                  return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={active ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span>{t(item.label)}</Link>;
              })}
              </nav>
              <Link href="/contact" className="material-orbit-specialist">{t("Ask a specialist")} <span aria-hidden="true">&#8599;</span></Link>
            </div>

            <div className="material-orbit-discovery">
              <div className="material-orbit-category">
                <StorefrontCategoryMenu
                  label={t("Choose material family")}
                  href="/category"
                  active={categoryIsActive}
                  title={t("Source by material family")}
                  subtitle={t("Compare industrial chemicals, solvents, additives and cleaning materials")}
                  viewAllLabel={t("View complete catalog")}
                  entries={visibleCategoryLinks.map((entry) => ({
                    ...entry,
                    label: t(entry.label),
                    description: t(entry.description),
                  }))}
                  emptyLabel={t("Browse all categories")}
                />
              </div>
              <UniversalHeaderSearch
                inputId="material-orbit-search"
                outerClassName="material-orbit-search"
                placeholder={t("Search by material, grade, application or SKU")}
                searchLabel={t("Search the material catalog")}
                buttonLabel={t("Search")}
                suggestions={(visibleCategoryLinks.length > 0 ? visibleCategoryLinks : [
                  { label: "Industrial chemicals", description: "Trade packs and quantity tiers", href: "/search?q=industrial%20chemicals" },
                  { label: "Solvents", description: "Source by material and application", href: "/search?q=solvents" },
                  { label: "Specialty additives", description: "Performance and process additives", href: "/search?q=specialty%20additives" },
                  { label: "Cleaning chemicals", description: "Commercial and industrial cleaning materials", href: "/search?q=cleaning%20chemicals" },
                ]).map((entry) => ({ ...entry, label: t(entry.label), description: t(entry.description) }))}
                heading={t("Material groups")}
                hint={t("Choose a group or continue typing")}
                footerLabel={t("Open the complete material index")}
                emptyLabel={t("Search the complete catalog")}
              />
            </div>
          </div>

          <aside className="material-orbit-console" aria-label={t("Buyer console")}>
            <div className="material-orbit-console-heading"><span>{t("BUYER CONSOLE")}</span><i aria-hidden="true" /></div>
            <div className="material-orbit-console-tools">
              <Link href={signedIn ? "/account" : "/login"} className="material-orbit-account">
                <HeaderIcon><AccountIcon /></HeaderIcon>
                <span><small>{t("Trade account")}</small><strong>{signedIn ? t("My account") : t("Sign in")}</strong></span>
              </Link>
              <span className="material-orbit-icon material-orbit-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
              <span className="material-orbit-icon material-orbit-cart"><MiniCart languageCode={languageCode} directNavigation iconOnly /></span>
            </div>
            <Link href="/bulk-orders" className="material-orbit-rfq">
              <span>{t("RFQ / 01")}</span>
              <strong>{t("Plan a volume order")}</strong>
              <b aria-hidden="true">&#8594;</b>
            </Link>
            <details className="material-orbit-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /><span>{t("Menu")}</span></summary>
              <nav aria-label={t("Mobile navigation")}>
                <Link href="/category">{t("Browse all materials")}</Link>
                {materialNavLinks.map((item, index) => (
                  <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>
                ))}
                <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                <Link href="/bulk-orders">{t("Build an RFQ")}</Link>
              </nav>
            </details>
          </aside>
        </div>
      </header>
    );
  }

  if (isCoatingLab) {
    const coatingNavLinks = [
      { label: "Home", href: "/" },
      { label: "Catalog", href: "/category" },
      { label: "Offers", href: "/offers" },
      { label: "Buying Guide", href: "/buying-guide" },
      { label: "Bulk Orders", href: "/bulk-orders" },
      { label: "Contact", href: "/contact" },
    ];
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");
    return (
      <header
        className="storefront-header chroma-spec-header sticky top-0 z-[100]"
        data-header-variant="chroma-spec-deck"
        data-theme-design={designId}
        style={headerStyle}
      >
        <div className="chroma-spec-shell">
          <Link href="/" className="chroma-spec-brand" aria-label={`${brandName} ${t("Home")}`}>
            <span className="chroma-spec-fan" aria-hidden="true">
              <i /><i /><i /><i />
              <b>
                {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoImageUrl.trim()} alt="" />
                ) : brandName.slice(0, 1).toUpperCase()}
              </b>
            </span>
            <span className="chroma-spec-brand-copy">
              <em>{t("PRO SERIES")} / 15</em>
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Paints, coatings & adhesives")}</small>
            </span>
            <span className="chroma-spec-brand-index" aria-hidden="true">15</span>
          </Link>

          <div className="chroma-spec-workspace">
            <div className="chroma-spec-sequence">
              <div className="chroma-spec-sequence-title">
                <strong>{t("COATING SPECIFICATION DECK")}</strong>
                <small>{t("Trade coatings and application systems")}</small>
              </div>
              <nav className="chroma-spec-page-links" aria-label={t("Quick navigation")}>
                {coatingNavLinks.map((item, index) => {
                  const path = item.href.split("?")[0];
                  const active = path === "/" ? currentPath === "/" : currentPath === path || currentPath.startsWith(`${path}/`);
                  return <Link key={`${item.href}-${index}`} href={item.href} className={active ? "is-active" : ""}>{t(item.label)}</Link>;
                })}
              </nav>
              <Link href="/contact" className="chroma-spec-specialist">{t("Ask a specialist")} <span aria-hidden="true">&#8599;</span></Link>
            </div>

            <div className="chroma-spec-core">
              <div className="chroma-spec-discovery">
                <div className="chroma-spec-category-slot">
                  <StorefrontCategoryMenu
                    label={t("Browse categories")}
                    href="/category"
                    active={categoryIsActive}
                    title={t("Source by substrate and application")}
                    subtitle={t("Compare paints, finishes, primers, adhesives and sealants")}
                    viewAllLabel={t("View the complete catalog")}
                    entries={visibleCategoryLinks.map((entry) => ({ ...entry, label: t(entry.label), description: t(entry.description) }))}
                    emptyLabel={t("Browse all categories")}
                  />
                </div>
                <CoatingSystemSearch
                  languageCode={languageCode}
                  suggestions={visibleCategoryLinks.map((entry) => ({
                    label: entry.label,
                    description: entry.description,
                    href: entry.href,
                  }))}
                />
              </div>

              <aside className="chroma-spec-tools" aria-label={t("Buyer tools")}>
                <Link href={signedIn ? "/account" : "/login"} className="chroma-spec-account">
                  <HeaderIcon><AccountIcon /></HeaderIcon>
                  <span><small>{t("Buyer profile")}</small><strong>{signedIn ? t("My account") : t("Sign in")}</strong></span>
                </Link>
                <span className="chroma-spec-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
                <span className="chroma-spec-cart"><MiniCart languageCode={languageCode} /></span>
                <Link href="/bulk-orders" className="chroma-spec-rfq"><span>RFQ</span><strong>{t("Plan volume order")}</strong><b aria-hidden="true">&#8599;</b></Link>
                <details className="chroma-spec-mobile-menu">
                  <summary aria-label={t("Open menu")}><MenuIcon /></summary>
                  <nav aria-label={t("Mobile navigation")}>
                    <Link href="/category">{t("Browse all systems")}</Link>
                    {coatingNavLinks.map((item, index) => (
                      <Link key={`${item.href}-${index}`} href={item.href}>{t(item.label)}</Link>
                    ))}
                    <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                  </nav>
                </details>
              </aside>
            </div>

          </div>
        </div>
      </header>
    );
  }

  if (isCoatingLab && variant === "legacy-coating-lab") {
    const coatingNavLinks = [
      { label: "Home", href: "/" },
      { label: "Products", href: "/category" },
      { label: "Offers", href: "/offers" },
      { label: "Buying Guide", href: "/buying-guide" },
      { label: "Bulk Orders", href: "/bulk-orders" },
      { label: "Contact", href: "/contact" },
    ];
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");

    return (
      <header
        className="storefront-header coating-lab-header sticky top-0 z-[100]"
        data-header-variant="coating-lab"
        data-theme-design={designId}
        style={headerStyle}
      >
        <div className="coating-lab-rail">
          <div className="coating-lab-rail-inner">
            <p><span aria-hidden="true" /> {t("Coating systems for professional buyers")}</p>
            <div className="coating-lab-rail-tags" aria-label={t("Application areas")}>
              <span>{t("Interior")}</span>
              <span>{t("Metal")}</span>
              <span>{t("Wood")}</span>
              <span>{t("Bonding")}</span>
            </div>
            <Link href="/contact">{t("Talk to a product specialist")} <span aria-hidden="true">&#8599;</span></Link>
          </div>
        </div>

        <div className="coating-lab-main">
          <Link href="/" className="coating-lab-brand" aria-label={`${brandName} ${t("Home")}`}>
            <span className="coating-lab-brand-mark" aria-hidden="true">
              {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoImageUrl.trim()} alt="" />
              ) : (
                <strong>{brandName.slice(0, 1).toUpperCase()}</strong>
              )}
              <i /><i /><i />
            </span>
            <span className="coating-lab-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Paints, coatings & adhesives")}</small>
            </span>
          </Link>

          <form action="/search" role="search" className="coating-lab-search">
            <label htmlFor="coating-lab-search-input" className="sr-only">{t("Search coating systems")}</label>
            <span className="coating-lab-search-icon" aria-hidden="true"><SearchIcon /></span>
            <input
              id="coating-lab-search-input"
              name="q"
              type="search"
              placeholder={t("Search by surface, chemistry or application")}
            />
            <label className="coating-lab-search-select">
              <span className="sr-only">{t("Category")}</span>
              <select name="category" defaultValue="">
                <option value="">{t("All systems")}</option>
                {visibleCategoryLinks.slice(0, 6).map((entry) => (
                  <option key={entry.href} value={entry.label}>{t(entry.label)}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </label>
            <button type="submit">{t("Find products")}</button>
          </form>

          <aside className="coating-lab-tools" aria-label={t("Buyer tools")}>
            <Link href={signedIn ? "/account" : "/login"} className="coating-lab-account">
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><small>{t("Trade account")}</small><strong>{signedIn ? t("My account") : t("Sign in")}</strong></span>
            </Link>
            <span className="coating-lab-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
            <span className="coating-lab-cart"><MiniCart languageCode={languageCode} /></span>
            <Link href="/bulk-orders" className="coating-lab-rfq"><small>{t("Need volume pricing?")}</small><strong>{t("Build an RFQ")}</strong><span aria-hidden="true">&#8594;</span></Link>
            <details className="coating-lab-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <nav aria-label={t("Mobile navigation")}>
                <Link href="/category">{t("Browse all systems")}</Link>
                {coatingNavLinks.map((item, index) => (
                  <Link key={`${item.href}-${index}`} href={item.href}>{t(item.label)}</Link>
                ))}
                <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
              </nav>
            </details>
          </aside>
        </div>

        <div className="coating-lab-nav-shell">
          <nav className="coating-lab-nav" aria-label={t("Main navigation")}>
            <StorefrontCategoryMenu
              label={t("Browse coating systems")}
              href="/category"
              active={categoryIsActive}
              title={t("Source by application")}
              subtitle={t("Compare paints, finishes, primers, adhesives and sealants")}
              viewAllLabel={t("View the complete catalog")}
              entries={visibleCategoryLinks.map((entry) => ({
                ...entry,
                label: t(entry.label),
                description: t(entry.description),
              }))}
              emptyLabel={t("Browse all categories")}
            />
            <div className="coating-lab-nav-links">
              {coatingNavLinks.map((item, index) => {
                const path = item.href.split("?")[0];
                const active = path === "/" ? currentPath === "/" : currentPath === path || currentPath.startsWith(`${path}/`);
                return <Link key={`${item.href}-${index}`} href={item.href} className={active ? "is-active" : ""}>{t(item.label)}</Link>;
              })}
            </div>
            <p className="coating-lab-nav-note"><span aria-hidden="true">&#9670;</span>{t("Samples · MOQ · bulk pricing")}</p>
          </nav>
        </div>
      </header>
    );
  }

  if (isQuarryCommand) {
    const configuredQuarryNavLinks = links.filter((item) =>
      item.href !== "/login"
      && item.href !== "/account"
      && item.href !== "/cart"
      && !item.label.toLowerCase().includes("categor"),
    );
    const quarryNavDefaults = [
      { label: "Home", href: "/" },
      { label: "Products", href: "/category" },
      { label: "Offers", href: "/offers" },
      { label: "Bulk Orders", href: "/bulk-orders" },
      { label: "Buying Guide", href: "/buying-guide" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ];
    const configuredQuarryHrefs = new Set(configuredQuarryNavLinks.map((item) => item.href.split("?")[0]));
    const quarryNavLinks = [
      ...configuredQuarryNavLinks,
      ...quarryNavDefaults.filter((item) => !configuredQuarryHrefs.has(item.href)),
    ].slice(0, 7);
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");
    return (
      <header
        className="storefront-header quarry-command-header sticky top-0 z-[100]"
        data-header-variant="quarry-command"
        data-theme-design={designId}
        style={headerStyle}
      >
        <div className="quarry-pro-utility">
          <div className="quarry-pro-utility-inner">
            <p><i aria-hidden="true" /> {t("Construction material supply for trade buyers")}</p>
            <div className="quarry-pro-promises" aria-label={t("Trade services")}>
              <span>{t("Verified trade pricing")}</span>
              <span>{t("Project quantity support")}</span>
              <span>{t("Delivery coordination")}</span>
            </div>
            <Link href="/contact">{t("Talk to buying desk")} <span aria-hidden="true">&#8594;</span></Link>
          </div>
        </div>

        <div className="quarry-pro-main">
          <Link href="/" className="quarry-pro-brand" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} className="quarry-pro-brand-image" />
            ) : (
              <span className="quarry-pro-brand-mark" aria-hidden="true">BQ</span>
            )}
            <span className="quarry-pro-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Construction material sourcing")}</small>
            </span>
          </Link>

          <UniversalHeaderSearch
            inputId="quarry-material-search"
            outerClassName="quarry-pro-search"
            layout="quarry"
            placeholder={t("Search cement, steel, blocks, brands or specifications")}
            searchLabel={t("Search building materials")}
            buttonLabel={t("Search")}
            suggestions={(visibleCategoryLinks.length > 0 ? visibleCategoryLinks : [
              { label: "Cement and concrete", description: "Binders, mixes and concrete products", href: "/search?q=cement%20concrete" },
              { label: "Steel and reinforcement", description: "Structural steel, bars and reinforcement", href: "/search?q=steel%20reinforcement" },
              { label: "Blocks and masonry", description: "Blocks, bricks and masonry supplies", href: "/search?q=blocks%20masonry" },
              { label: "Waterproofing systems", description: "Membranes, chemicals and sealants", href: "/search?q=waterproofing" },
            ]).map((entry) => ({ ...entry, label: t(entry.label), description: t(entry.description) }))}
            heading={t("Suggested material categories")}
            hint={t("Choose a category or continue typing")}
            footerLabel={t("Browse the complete catalog")}
            emptyLabel={t("Search the complete catalog")}
          />

          <aside className="quarry-pro-tools" aria-label={t("Buyer tools")}>
            <Link href={signedIn ? "/account" : "/login"} className="quarry-pro-account">
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><small>{t("Trade account")}</small><strong>{signedIn ? t("My account") : t("Sign in")}</strong></span>
            </Link>
            <div className="quarry-pro-icon quarry-pro-wishlist"><WishlistHeaderLink languageCode={languageCode} /></div>
            <div className="quarry-pro-icon quarry-pro-cart"><MiniCart languageCode={languageCode} /></div>
            <Link href="/bulk-orders" className="quarry-pro-rfq"><small>{t("Buying desk")}</small><strong>{t("Request a quote")}</strong><span aria-hidden="true">&#8599;</span></Link>
            <details className="quarry-pro-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <nav aria-label={t("Mobile navigation")}>
                <Link href="/category">{t("Browse all materials")}</Link>
                {quarryNavLinks.map((item, index) => (
                  <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>
                ))}
                <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                <Link href="/bulk-orders">{t("Build an RFQ")}</Link>
              </nav>
            </details>
          </aside>
        </div>

        <div className="quarry-pro-nav-shell">
          <nav className="quarry-pro-nav" aria-label={t("Main navigation")}>
            <StorefrontCategoryMenu
              label={t("Browse materials")}
              href="/category"
              active={categoryIsActive}
              title={t("Source by material group")}
              subtitle={t("Compare construction supplies for your next project order")}
              viewAllLabel={t("View complete catalog")}
              entries={visibleCategoryLinks.map((entry) => ({
                ...entry,
                label: t(entry.label),
                description: t(entry.description),
              }))}
              emptyLabel={t("Browse all categories")}
            />
            <div className="quarry-pro-nav-links">
              {quarryNavLinks.map((item, index) => {
                const path = item.href.split("?")[0];
                const active = path === "/" ? currentPath === "/" : currentPath === path || currentPath.startsWith(`${path}/`);
                return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={active ? "is-active" : ""}>{t(item.label)}</Link>;
              })}
            </div>
            <div className="quarry-pro-nav-note"><span aria-hidden="true">&#9670;</span>{t("Bulk quantities & scheduled delivery")}</div>
          </nav>
        </div>
      </header>
    );
  }

  if (isFieldLedger) {
    const fieldNavLinks = links.filter((item) => item.href !== "/login" && item.href !== "/account" && item.href !== "/cart");
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");
    return (
      <header
        className="storefront-header field-horizon-header sticky top-0 z-[100]"
        data-header-variant="field-horizon"
        data-theme-design={designId}
        style={headerStyle}
      >
        <div className="field-horizon-shell">
          <Link href="/" className="field-horizon-brand" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} className="field-horizon-brand-image" />
            ) : (
              <span className="field-horizon-brand-mark" aria-hidden="true">FS</span>
            )}
            <span className="field-horizon-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Agriculture trade supply")}</small>
            </span>
          </Link>

          <nav className="field-horizon-nav" aria-label={t("Main navigation")}>
            {fieldNavLinks
              .filter((item) => !item.label.toLowerCase().includes("categor"))
              .slice(0, 4)
              .map((item, index) => {
                const path = item.href.split("?")[0];
                const active = path === "/" ? currentPath === "/" : currentPath === path || currentPath.startsWith(`${path}/`);
                return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={active ? "is-active" : ""}>{t(item.label)}</Link>;
              })}
          </nav>

          <div className="field-horizon-finder">
            <StorefrontCategoryMenu
              label={t("Browse inputs")}
              href="/category"
              active={categoryIsActive}
              title={t("Source by field requirement")}
              subtitle={t("Seeds, nutrition, crop care and farm equipment")}
              viewAllLabel={t("View complete catalog")}
              entries={visibleCategoryLinks.map((entry) => ({
                ...entry,
                label: t(entry.label),
                description: t(entry.description),
              }))}
              emptyLabel={t("Browse all categories")}
            />
            <SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} />
          </div>

          <aside className="field-horizon-actions" aria-label={t("Buyer tools")}>
            <Link href="/bulk-orders" className="field-horizon-rfq">
              <small>{t("Bulk sourcing")}</small>
              <span>{t("Build an RFQ")} &#8599;</span>
            </Link>
            <Link href={signedIn ? "/account" : "/login"} className="field-horizon-account" aria-label={signedIn ? t("My Account") : t("Login / Register")}>
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><small>{t("Buyer account")}</small><strong>{signedIn ? t("My account") : t("Sign in")}</strong></span>
            </Link>
            <div className="field-horizon-wishlist"><WishlistHeaderLink languageCode={languageCode} /></div>
            <div className="field-horizon-cart"><MiniCart languageCode={languageCode} /></div>
            <details className="field-horizon-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <div className="field-horizon-mobile-panel">
                <nav aria-label={t("Mobile navigation")}>
                  <Link href="/category">{t("Browse inputs")}</Link>
                  {fieldNavLinks.map((item, index) => <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>)}
                  <Link href="/bulk-orders">{t("Build an RFQ")}</Link>
                  <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                  <Link href={signedIn ? "/wishlist" : "/login?next=%2Fwishlist"}>{t("Wishlist")}</Link>
                </nav>
              </div>
            </details>
          </aside>

          <div className="field-horizon-mobile-search"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} mobile /></div>
        </div>
      </header>
    );
  }

  if (isMachineryCommand) {
    return (
      <header className="storefront-header machinery-index-header sticky top-0 z-[100]" data-header-variant="machinery-index" data-theme-design={designId} style={headerStyle}>
        <div className="machinery-index-shell">
          <Link href="/" className="machinery-index-brand" aria-label={`${brandName} ${t("Home")}`}>
            <span className="machinery-index-mark" aria-hidden="true"><strong>MF</strong></span>
            <span className="machinery-index-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Machinery")}</small>
            </span>
          </Link>

          <nav className="machinery-index-nav" aria-label={t("Main navigation")}>
            {links.map((item, index) => {
              const isActive = index === activeLinkIndex;
              const isCategoryNav = item.label.toLowerCase().includes("categor");
              if (isCategoryNav) {
                return (
                  <StorefrontCategoryMenu
                    key={`${item.href}-${item.label}-${index}`}
                    label={t("Machine index")}
                    href={item.href}
                    active={isActive}
                    title={t("Browse machinery categories")}
                    subtitle={t("Start with your production requirement")}
                    viewAllLabel={t("View complete index")}
                    entries={visibleCategoryLinks.map((entry) => ({
                      ...entry,
                      label: t(entry.label),
                      description: t(entry.description),
                    }))}
                    emptyLabel={t("Browse all categories")}
                  />
                );
              }
              return (
                <Link
                  key={`${item.href}-${item.label}-${index}`}
                  href={item.href}
                  className={isActive ? "is-active" : ""}
                >
                  {t(item.label)}
                </Link>
              );
            })}
          </nav>

          <div className="machinery-index-tools">
            <Link href="/contact" className="machinery-index-spec-desk">
              <span>{t("Spec desk")}</span>
              <small>{t("Build an RFQ")}</small>
            </Link>
            <details className="machinery-index-finder">
              <summary aria-label={t("Search products")}>
                <SearchIcon />
                <span>{t("Find equipment")}</span>
              </summary>
              <div className="machinery-index-finder-panel">
                <div>
                  <span>{t("SPECIFICATION FINDER")}</span>
                  <strong>{t("Search by machine, component or SKU")}</strong>
                </div>
                <SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} mobile />
              </div>
            </details>
            <Link href={signedIn ? "/account" : "/login"} className="machinery-index-account" aria-label={signedIn ? t("My Account") : t("Login / Register")}>
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span>{signedIn ? t("Account") : t("Sign in")}</span>
            </Link>
            <div className="machinery-index-wishlist"><WishlistHeaderLink languageCode={languageCode} /></div>
            <div className="machinery-index-cart"><MiniCart languageCode={languageCode} /></div>
            <details className="machinery-index-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <div>
                <nav aria-label={t("Mobile navigation")}>
                  {links.map((item, index) => (
                    <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>
                      {t(item.label)}
                    </Link>
                  ))}
                  <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                  <Link href={signedIn ? "/wishlist" : "/login?next=%2Fwishlist"}>{t("Wishlist")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>
        <div className="machinery-index-baseline" aria-hidden="true">
          <span>MF / DIGITAL CATALOGUE</span>
          <span>EQUIPMENT DIVISIONS</span>
          <span>SPECIFICATION-LED SOURCING</span>
        </div>
      </header>
    );
  }

  if (isMarketDesk) {
    const marketNavLinks = links.filter((item) => {
      const normalized = item.label.toLowerCase();
      return !normalized.includes("categor") && item.href !== "/login" && item.href !== "/account";
    });
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");

    return (
      <header className="storefront-header market-desk-header sticky top-0 z-[100]" data-header-variant="market-desk" data-theme-design={designId} style={headerStyle}>
        <div className="market-desk-rail">
          <div className="market-desk-rail-inner">
            <span className="market-desk-status"><i aria-hidden="true" /> {t("Trade catalog open for business")}</span>
            <span className="market-desk-promise">{t("Clear packs")} <b aria-hidden="true">/</b> {t("Live availability")} <b aria-hidden="true">/</b> {t("Bulk pricing")}</span>
            <div className="market-desk-rail-links">
              <Link href="/orders">{t("Track orders")}</Link>
              <Link href="/contact">{t("Buyer support")} <span aria-hidden="true">&#8599;</span></Link>
            </div>
          </div>
        </div>

        <div className="market-desk-main">
          <Link href="/" className="market-desk-brand" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} />
            ) : (
              <span className="market-desk-mark" aria-hidden="true">{brandName.slice(0, 2).toUpperCase()}</span>
            )}
            <span className="market-desk-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Business marketplace")}</small>
            </span>
          </Link>

          <div className="market-desk-search">
            <SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} />
          </div>

          <div className="market-desk-tools">
            <Link href={signedIn ? "/account" : "/login"} className="market-desk-account" aria-label={signedIn ? t("My Account") : t("Login / Register")}>
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><strong>{signedIn ? t("Account") : t("Sign in")}</strong><small>{signedIn ? t("Manage profile") : t("Business account")}</small></span>
            </Link>
            <span className="market-desk-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
            <span className="market-desk-cart"><MiniCart languageCode={languageCode} /></span>
            <details className="market-desk-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <div>
                <nav aria-label={t("Mobile navigation")}>
                  <Link href="/category">{t("All categories")}</Link>
                  {marketNavLinks.map((item, index) => (
                    <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>
                  ))}
                  <WishlistHeaderLink languageCode={languageCode} displayMode="mobile-nav" />
                  <MiniCart languageCode={languageCode} displayMode="mobile-nav" directNavigation />
                  <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>

        <div className="market-desk-nav-shell">
          <nav className="market-desk-nav" aria-label={t("Main navigation")}>
            <StorefrontCategoryMenu
              label={t("Shop all categories")}
              href="/category"
              active={categoryIsActive}
              title={t("Browse the catalog")}
              subtitle={t("Find products by business collection")}
              viewAllLabel={t("View all categories")}
              entries={visibleCategoryLinks.map((entry) => ({
                ...entry,
                label: t(entry.label),
                description: t(entry.description),
              }))}
              emptyLabel={t("Browse all categories")}
            />
            <span className="market-desk-nav-divider" aria-hidden="true" />
            {marketNavLinks.map((item, index) => {
              const isActive = index === activeLinkIndex || (item.href === "/" && currentPath === "/");
              return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={isActive ? "is-active" : ""}>{t(item.label)}</Link>;
            })}
            <Link href="/bulk-orders" className="market-desk-rfq">{t("Plan a bulk order")} <span aria-hidden="true">&#8594;</span></Link>
          </nav>
        </div>

        <div className="market-desk-mobile-search"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} mobile /></div>
      </header>
    );
  }

  if (isGaragePro) {
    const garageNavLinks = links.filter((item) => {
      const normalized = item.label.toLowerCase();
      return !normalized.includes("categor")
        && item.href !== "/login"
        && item.href !== "/account"
        && item.href !== "/cart";
    });
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");

    return (
      <header className="storefront-header pitlane-header sticky top-0 z-[100]" data-header-variant="pitlane-command" data-theme-design={designId} style={headerStyle}>
        <div className="pitlane-main">
          <Link href="/" className="pitlane-brand" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} />
            ) : (
              <span className="pitlane-mark" aria-hidden="true">{brandName.slice(0, 2).toUpperCase()}</span>
            )}
            <span className="pitlane-brand-copy">
              <strong>{brandName}</strong>
              <small><i aria-hidden="true" /> {brandCaption || t("Automotive trade supply")}</small>
            </span>
          </Link>

          <nav className="pitlane-primary-nav" aria-label={t("Main navigation")}>
            {garageNavLinks.map((item, index) => {
              const isActive = index === activeLinkIndex || (item.href === "/" && currentPath === "/");
              return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={isActive ? "is-active" : ""}>{t(item.label)}</Link>;
            })}
          </nav>

          <div className="pitlane-tools">
            <Link href={signedIn ? "/account" : "/login"} className="pitlane-account" aria-label={signedIn ? t("My Account") : t("Login / Register")}>
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><strong>{signedIn ? t("Account") : t("Sign in")}</strong><small>{t("Trade desk")}</small></span>
            </Link>
            <span className="pitlane-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
            <span className="pitlane-cart"><MiniCart languageCode={languageCode} /></span>
            <details className="pitlane-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <div>
                <nav aria-label={t("Mobile navigation")}>
                  <Link href="/category">{t("Vehicle systems")}</Link>
                  {garageNavLinks.map((item, index) => (
                    <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>
                  ))}
                  <WishlistHeaderLink languageCode={languageCode} displayMode="mobile-nav" />
                  <MiniCart languageCode={languageCode} displayMode="mobile-nav" directNavigation />
                  <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>

        <div className="pitlane-finder-shell">
          <div className="pitlane-finder">
            <StorefrontCategoryMenu
              label={t("Vehicle systems")}
              href="/category"
              active={categoryIsActive}
              title={t("Browse automotive categories")}
              subtitle={t("Find workshop parts by system")}
              viewAllLabel={t("View all parts categories")}
              entries={visibleCategoryLinks.map((entry) => ({
                ...entry,
                label: t(entry.label),
                description: t(entry.description),
              }))}
              emptyLabel={t("Browse all categories")}
            />
            <div className="pitlane-search"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} /></div>
            <Link href="/bulk-orders" className="pitlane-rfq"><span>{t("Build an RFQ")}</span><b aria-hidden="true">&#8594;</b></Link>
          </div>
        </div>
      </header>
    );
  }

  if (isPantryShelfDesk) {
    const pantryNavLinks = links.filter((item) => {
      const normalized = item.label.toLowerCase();
      return !normalized.includes("categor")
        && item.href !== "/login"
        && item.href !== "/account"
        && item.href !== "/cart";
    });
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");

    return (
      <header className="storefront-header pantry-route-header sticky top-0 z-[100]" data-header-variant="pantry-route-command" data-theme-design={designId} style={headerStyle}>
        <div className="pantry-route-main">
          <Link href="/" className="pantry-route-brand" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} />
            ) : (
              <span className="pantry-route-mark" aria-hidden="true">
                <strong>{brandName.slice(0, 1).toUpperCase()}</strong>
                <i /><i /><i />
              </span>
            )}
            <span className="pantry-route-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Trade grocery network")}</small>
            </span>
          </Link>

          <nav className="pantry-route-primary-nav" aria-label={t("Main navigation")}>
            {pantryNavLinks.map((item, index) => {
              const itemPath = item.href.split("?")[0];
              const isActive = itemPath === "/" ? currentPath === "/" : currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
              return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={isActive ? "is-active" : ""}>{t(item.label)}</Link>;
            })}
          </nav>

          <div className="pantry-route-tools">
            <Link href={signedIn ? "/account" : "/login"} className="pantry-route-account" aria-label={signedIn ? t("My Account") : t("Login / Register")}>
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><strong>{signedIn ? t("Account") : t("Sign in")}</strong><small>{signedIn ? t("Manage profile") : t("Buyer access")}</small></span>
            </Link>
            <span className="pantry-route-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
            <span className="pantry-route-cart"><MiniCart languageCode={languageCode} /></span>
            <details className="pantry-route-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <div>
                <nav aria-label={t("Mobile navigation")}>
                  <Link href="/category">{t("Browse aisles")}</Link>
                  {pantryNavLinks.map((item, index) => (
                    <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>
                  ))}
                  <WishlistHeaderLink languageCode={languageCode} displayMode="mobile-nav" />
                  <MiniCart languageCode={languageCode} displayMode="mobile-nav" directNavigation />
                  <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>

        <section className="pantry-route-command-shell" aria-label={t("Grocery buying command")}>
          <div className="pantry-route-command">
            <StorefrontCategoryMenu
              label={t("Shop all aisles")}
              href="/category"
              active={categoryIsActive}
              title={t("Shop by grocery aisle")}
              subtitle={t("Build a balanced retail assortment")}
              viewAllLabel={t("View all categories")}
              entries={visibleCategoryLinks.map((entry) => ({
                ...entry,
                label: t(entry.label),
                description: t(entry.description),
              }))}
              emptyLabel={t("Browse all categories")}
            />
            <div className="pantry-route-search"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} /></div>
            <Link href="/bulk-orders" className="pantry-route-desk">
              <span>{t("Restock desk")}</span>
              <small>{t("Bulk order support")} <b aria-hidden="true">&#8594;</b></small>
            </Link>
          </div>
        </section>
      </header>
    );
  }

  if (isCareLedgerDesk) {
    const careLedgerLinks = links.filter((item) => item.href !== "/cart" && item.href !== "/login" && item.href !== "/account");
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");

    return (
      <header className="storefront-header care-ledger-header sticky top-0 z-[100]" data-header-variant="care-ledger-desk" data-theme-design={designId} style={headerStyle}>
        <div className="care-ledger-signal-rail">
          <div className="care-ledger-signal-inner">
            <span className="care-ledger-live"><i aria-hidden="true" /> {t("Procurement workspace online")}</span>
            <span className="care-ledger-signal-copy">{t("Demo catalogue")} <b aria-hidden="true">/</b> {t("Verify product details with the supplier")}</span>
            <div className="care-ledger-signal-links">
              <Link href="/orders">{t("Track orders")}</Link>
              <Link href="/contact">{t("Buyer support")} <span aria-hidden="true">&#8599;</span></Link>
            </div>
          </div>
        </div>

        <div className="care-ledger-main">
          <Link href="/" className="care-ledger-brand" aria-label={`${brandName} ${t("Home")}`}>
            <span className="care-ledger-brand-mark" aria-hidden="true"><i />CL</span>
            <span className="care-ledger-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Healthcare trade desk")}</small>
            </span>
          </Link>

          <div className="care-ledger-search-desk">
            <div className="care-ledger-search-label">
              <span>{t("CATALOGUE SEARCH")}</span>
              <small>{t("Products, packs and categories")}</small>
            </div>
            <SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} />
          </div>

          <div className="care-ledger-tools">
            <Link href={signedIn ? "/account" : "/login"} className="care-ledger-account">
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><strong>{signedIn ? t("Buyer account") : t("Sign in")}</strong><small>{signedIn ? t("Manage workspace") : t("Business access")}</small></span>
            </Link>
            <span className="care-ledger-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
            <span className="care-ledger-cart"><MiniCart languageCode={languageCode} /></span>
            <details className="care-ledger-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <div>
                <nav aria-label={t("Mobile navigation")}>
                  {careLedgerLinks.map((item, index) => <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>)}
                  <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("Buyer account") : t("Login / Register")}</Link>
                  <Link href={signedIn ? "/wishlist" : "/login?next=%2Fwishlist"}>{t("Wishlist")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>

        <div className="care-ledger-nav-shell">
          <nav className="care-ledger-nav" aria-label={t("Main navigation")}>
            <StorefrontCategoryMenu
              label={t("Care pathways")}
              href="/category"
              active={categoryIsActive}
              title={t("Browse healthcare categories")}
              subtitle={t("Build a sourcing list by collection")}
              viewAllLabel={t("View all categories")}
              entries={visibleCategoryLinks.map((entry) => ({ ...entry, label: t(entry.label), description: t(entry.description) }))}
              emptyLabel={t("Browse all categories")}
            />
            {careLedgerLinks.filter((item) => !item.label.toLowerCase().includes("categor")).map((item, index) => {
              const isActive = item.href === "/" ? currentPath === "/" : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={isActive ? "is-active" : ""}>{t(item.label)}</Link>;
            })}
            <span className="care-ledger-nav-spacer" />
            <Link href="/bulk-orders" className="care-ledger-rfq">{t("Build bulk request")} <span aria-hidden="true">&#8594;</span></Link>
          </nav>
        </div>

        <div className="care-ledger-mobile-search"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} mobile /></div>
      </header>
    );
  }

  if (isClinicalNavigator) {
    const clinicalLinks = links.filter((item) => item.href !== "/cart" && item.href !== "/login" && item.href !== "/account");
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");
    const clinicalMark = brandName
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "CS";

    return (
      <header className="storefront-header clinical-navigator-header clinical-dossier-header sticky top-0 z-[100]" data-header-variant="clinical-dossier" data-theme-design={designId} style={headerStyle}>
        <div className="clinical-navigator-frame">
          <Link href="/" className="clinical-navigator-brand" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} className="clinical-navigator-logo" />
            ) : (
              <span className="clinical-navigator-mark" aria-hidden="true">
                <i />
                <strong>{clinicalMark}</strong>
              </span>
            )}
            <span className="clinical-navigator-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Medical sourcing desk")}</small>
            </span>
            <span className="clinical-navigator-code" aria-hidden="true">MEDICAL TRADE</span>
          </Link>

          <div className="clinical-navigator-console">
            <div className="clinical-navigator-status">
              <span className="clinical-navigator-live"><i aria-hidden="true" /> {t("Clinical supply network online")}</span>
              <span className="clinical-navigator-promise">{t("Clear packs")} <b aria-hidden="true">/</b> {t("Quantity pricing")} <b aria-hidden="true">/</b> {t("Buyer support")}</span>
              <div className="clinical-navigator-status-links">
                <Link href="/orders">{t("Track order")}</Link>
                <Link href="/contact">{t("Sourcing desk")} <span aria-hidden="true">&#8599;</span></Link>
              </div>
            </div>

            <div className="clinical-navigator-workbar">
              <nav className="clinical-navigator-nav" aria-label={t("Main navigation")}>
                <StorefrontCategoryMenu
                  label={t("Catalog index")}
                  href="/category"
                  active={categoryIsActive}
                  title={t("Browse clinical categories")}
                  subtitle={t("Build a sourcing list by equipment type")}
                  viewAllLabel={t("View complete catalog")}
                  entries={visibleCategoryLinks.map((entry) => ({ ...entry, label: t(entry.label), description: t(entry.description) }))}
                  emptyLabel={t("Browse all categories")}
                />
                {clinicalLinks.filter((item) => !item.label.toLowerCase().includes("categor")).map((item, index) => {
                  const isActive = item.href === "/" ? currentPath === "/" : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                  return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={isActive ? "is-active" : ""}>{t(item.label)}</Link>;
                })}
              </nav>

              <div className="clinical-navigator-search"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} /></div>

              <div className="clinical-navigator-tools">
                <Link href={signedIn ? "/account" : "/login"} className="clinical-navigator-account" aria-label={signedIn ? t("My Account") : t("Login / Register")}>
                  <HeaderIcon><AccountIcon /></HeaderIcon>
                  <span><strong>{signedIn ? t("Account") : t("Sign in")}</strong><small>{signedIn ? t("Buyer workspace") : t("Business access")}</small></span>
                </Link>
                <span className="clinical-navigator-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
                <span className="clinical-navigator-cart"><MiniCart languageCode={languageCode} /></span>
                <details className="clinical-navigator-mobile-menu">
                  <summary aria-label={t("Open menu")}><MenuIcon /></summary>
                  <div>
                    <nav aria-label={t("Mobile navigation")}>
                      <Link href="/category">{t("Catalog index")}</Link>
                      {clinicalLinks.filter((item) => !item.label.toLowerCase().includes("categor")).map((item, index) => (
                        <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>
                      ))}
                      <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                      <Link href={signedIn ? "/wishlist" : "/login?next=%2Fwishlist"}>{t("Wishlist")}</Link>
                    </nav>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
        <span className="clinical-dossier-edge" aria-hidden="true">MEDICAL PROCUREMENT</span>
        <div className="clinical-navigator-mobile-search"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} mobile /></div>
      </header>
    );
  }

  if (isBeautyStudio) {
    const beautyNavLinks = [
      { label: "Home", href: "/" },
      { label: "Products", href: "/category" },
      { label: "Offers", href: "/offers" },
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ];
    const categoryIsActive = currentPath === "/category" || currentPath.startsWith("/category/");

    return (
      <header className="storefront-header beauty-studio-header sticky top-0 z-[100]" data-header-variant="beauty-studio" data-theme-design={designId} style={headerStyle}>
        <div className="beauty-studio-rail">
          <div className="beauty-studio-rail-inner">
            <span className="beauty-studio-rail-kicker"><i aria-hidden="true" /> {t("Professional beauty sourcing")}</span>
            <span className="beauty-studio-rail-note">{t("Trade pricing")} <b aria-hidden="true">/</b> {t("Curated collections")} <b aria-hidden="true">/</b> {t("Bulk-ready supply")}</span>
            <Link href="/contact" className="beauty-studio-rail-link">{t("Buyer concierge")} <span aria-hidden="true">&#8599;</span></Link>
          </div>
        </div>

        <div className="beauty-studio-main">
          <Link href="/" className="beauty-studio-brand" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} />
            ) : (
              <span className="beauty-studio-monogram" aria-hidden="true">{brandName.slice(0, 1).toUpperCase()}</span>
            )}
            <span className="beauty-studio-brand-copy">
              <strong>{brandName}</strong>
              <small>{brandCaption || t("Beauty trade studio")}</small>
            </span>
          </Link>

          <nav className="beauty-studio-nav" aria-label={t("Main navigation")}>
            <Link href="/" className={currentPath === "/" ? "is-active" : ""}>{t("Home")}</Link>
            <StorefrontCategoryMenu
              label={t("Collections")}
              href="/category"
              active={categoryIsActive}
              title={t("Shop beauty collections")}
              subtitle={t("Build a focused professional assortment")}
              viewAllLabel={t("View all collections")}
              entries={visibleCategoryLinks.map((entry) => ({
                ...entry,
                label: t(entry.label),
                description: t(entry.description),
              }))}
              emptyLabel={t("Browse all categories")}
            />
            {beautyNavLinks.filter((item) => item.href !== "/").map((item, index) => {
              const isActive = item.href === "/" ? currentPath === "/" : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              return <Link key={`${item.href}-${item.label}-${index}`} href={item.href} className={isActive ? "is-active" : ""}>{t(item.label)}</Link>;
            })}
          </nav>

          <div className="beauty-studio-tools">
            <Link href={signedIn ? "/account" : "/login"} className="beauty-studio-account" aria-label={signedIn ? t("My Account") : t("Login / Register")}>
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span><strong>{signedIn ? t("Account") : t("Sign in")}</strong><small>{signedIn ? t("Buyer workspace") : t("Trade access")}</small></span>
            </Link>
            <span className="beauty-studio-wishlist"><WishlistHeaderLink languageCode={languageCode} /></span>
            <span className="beauty-studio-cart"><MiniCart languageCode={languageCode} /></span>
            <details className="beauty-studio-mobile-menu">
              <summary aria-label={t("Open menu")}><MenuIcon /></summary>
              <div>
                <nav aria-label={t("Mobile navigation")}>
                  <Link href="/">{t("Home")}</Link>
                  <Link href="/category">{t("Collections")}</Link>
                  {beautyNavLinks.filter((item) => item.href !== "/").map((item, index) => (
                    <Link key={`${item.href}-${item.label}-${index}`} href={item.href}>{t(item.label)}</Link>
                  ))}
                  <Link href={signedIn ? "/account" : "/login"}>{signedIn ? t("My Account") : t("Login / Register")}</Link>
                  <Link href={signedIn ? "/wishlist" : "/login?next=%2Fwishlist"}>{t("Wishlist")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>

        <div className="beauty-studio-search-dock">
          <div className="beauty-studio-search-copy">
            <span>{t("SOURCE BY ROUTINE")}</span>
            <small>{t("Skin, hair, cosmetics & salon")}</small>
          </div>
          <div className="beauty-studio-search-desktop"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} /></div>
          <div className="beauty-studio-search-mobile"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} mobile /></div>
          <Link href="/bulk-orders" className="beauty-studio-bulk-link">{t("Plan a bulk order")} <span aria-hidden="true">&#8594;</span></Link>
        </div>
      </header>
    );
  }

  return (
    <header className={`storefront-header sticky top-0 z-[100] border-b border-slate-200 bg-white shadow-[0_5px_18px_rgba(15,23,42,0.05)] ${isTextileAtelier ? "textile-atelier-header" : ""} ${isPlantWorksControl ? "plantworks-control-header" : ""} ${isMachineryCommand ? "machinery-command-header" : ""}`} data-header-variant={variant ?? "search-led"} data-theme-design={designId} style={headerStyle}>
      {isTextileAtelier ? (
        <div className="textile-trade-rail">
          <div className="textile-trade-rail-inner">
            <span className="textile-trade-kicker">{t("Textile sourcing studio")}</span>
            <span className="textile-trade-note">{t("Material library")} <i aria-hidden="true" /> {t("Sampling")} <i aria-hidden="true" /> {t("Bulk supply")}</span>
            <Link href="/contact" className="textile-trade-desk">{t("Trade desk")} <span aria-hidden="true">&#8599;</span></Link>
          </div>
        </div>
      ) : null}
      {isPlantWorksControl ? (
        <div className="plantworks-status-rail">
          <div className="plantworks-status-rail-inner">
            <span className="plantworks-status-kicker">{t("PlantWorks procurement desk")}</span>
            <span className="plantworks-status-note"><i aria-hidden="true" /> {t("Material handling")} <b aria-hidden="true">/</b> {t("Workshop equipment")} <b aria-hidden="true">/</b> {t("Automation")}</span>
            <Link href="/contact" className="plantworks-status-link">{t("Talk to sourcing")} <span aria-hidden="true">&#8599;</span></Link>
          </div>
        </div>
      ) : null}
      {isMachineryCommand ? (
        <div className="machinery-command-rail">
          <div className="machinery-command-rail-inner">
            <span className="machinery-command-kicker"><i aria-hidden="true" /> {t("Industrial sourcing network online")}</span>
            <span className="machinery-command-note">{t("Machine specifications")} <b aria-hidden="true">/</b> {t("Quantity pricing")} <b aria-hidden="true">/</b> {t("Dispatch planning")}</span>
            <Link href="/contact" className="machinery-command-link">{t("Open RFQ desk")} <span aria-hidden="true">&#8599;</span></Link>
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8">
        <div className="storefront-header-main flex min-h-[82px] items-center gap-4 py-3 lg:gap-6 xl:min-h-[92px] xl:gap-8">
          <Link href="/" className={`flex min-w-0 shrink-0 items-center gap-3 ${isTextileAtelier ? "textile-brand-lockup" : ""} ${isPlantWorksControl ? "plantworks-brand-lockup" : ""}`} aria-label={`${brandName} ${t("Home")}`}>
            {isPlantWorksControl ? (
              <span className="plantworks-brand-mark" aria-hidden="true"><strong>PW</strong><i /></span>
            ) : typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12" />
            ) : (
              <span
                className="h-11 w-11 shrink-0 rounded-full shadow-[inset_-5px_-5px_10px_rgba(123,48,0,0.24),inset_4px_4px_9px_rgba(255,255,255,0.38),0_3px_8px_rgba(249,115,0,0.22)] sm:h-12 sm:w-12"
                style={{ background: "radial-gradient(circle at 34% 30%, var(--header-secondary), var(--header-primary) 62%, color-mix(in srgb, var(--header-primary) 70%, #7c2d12))" }}
                aria-hidden="true"
              />
            )}
            <span className="flex max-w-40 min-w-0 flex-col sm:max-w-48">
              <span className="truncate text-xl font-black leading-none tracking-tight text-slate-950 sm:text-2xl">{brandName}</span>
              {brandCaption ? <span className="mt-1 truncate text-[11px] font-medium text-slate-500 sm:text-xs">{brandCaption}</span> : null}
            </span>
          </Link>

          <div className="storefront-header-search min-w-0 flex-1"><SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} compactLuxury={isFootwearAtelier} textileAtelier={isTextileAtelier} /></div>

          <div className={`ml-auto flex shrink-0 items-center gap-2 sm:gap-4 xl:gap-5 ${isAtelierHeader ? "aurelia-utilities" : ""} ${isTextileAtelier ? "textile-utilities" : ""} ${isPlantWorksControl ? "plantworks-utilities" : ""}`}>
            {isCircuitIndustrial ? (
              <Link href="/contact" className="industrial-header-cta hidden xl:inline-flex">
                <span>{t("Plan a bulk order")}</span>
                <span aria-hidden="true">&#8599;</span>
              </Link>
            ) : null}
            {isCircuitIndustrial || isFootwearAtelier ? (
              <>
                <details className="industrial-commerce-menu group relative hidden lg:block">
                  <summary className="industrial-commerce-trigger flex cursor-pointer list-none items-center marker:hidden" aria-label={t("Open account and shopping menu")}>
                    <span className="industrial-commerce-trigger-icon" aria-hidden="true"><MenuIcon /></span>
                    <span>{t(isFootwearAtelier ? "Client menu" : "Trade menu")}</span>
                    <ChevronDownIcon />
                  </summary>
                  <div className="industrial-commerce-panel absolute right-0 top-full z-[120]">
                    <div className="industrial-commerce-panel-heading">
                      <span>{t(isFootwearAtelier ? "Your buying suite" : "Your workspace")}</span>
                      <small>{t(isFootwearAtelier ? "Account, saved styles and bag" : "Account and buying tools")}</small>
                    </div>
                    <div className="industrial-commerce-panel-links">
                      <Link
                        href={signedIn ? "/account" : customerLoginHref("/account")}
                        onClick={(event) => {
                          event.preventDefault();
                          window.location.assign(signedIn
                            ? storefrontHrefWithCurrentContext("/account")
                            : customerLoginHrefWithCurrentContext("/account"));
                        }}
                        className="industrial-commerce-account"
                      >
                        <HeaderIcon><AccountIcon /></HeaderIcon>
                        <span className="flex flex-col leading-tight">
                          <strong>{t("My Account")}</strong>
                          <small>{signedIn ? t("View profile") : `${t("Login")} / ${t("Register")}`}</small>
                        </span>
                        <span aria-hidden="true">&#8599;</span>
                      </Link>
                      {isFootwearAtelier ? (
                        <Link href="/contact" className="footwear-menu-enquiry">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--header-primary)] text-sm font-black text-white" aria-hidden="true">B</span>
                          <span className="flex flex-1 flex-col leading-tight">
                            <strong>{t("Bulk Enquiry")}</strong>
                            <small>{t("Talk to our buying team")}</small>
                          </span>
                          <span aria-hidden="true">&#8599;</span>
                        </Link>
                      ) : null}
                      <WishlistHeaderLink languageCode={languageCode} directNavigation />
                      <MiniCart languageCode={languageCode} directNavigation />
                    </div>
                  </div>
                </details>
                <div className="industrial-mobile-cart lg:hidden"><MiniCart languageCode={languageCode} /></div>
              </>
            ) : (
              <>
            {isPlantWorksControl ? (
              <Link href="/contact" className="plantworks-rfq hidden xl:inline-flex">
                <span>{t("Request quote")}</span>
                <span aria-hidden="true">&#8599;</span>
              </Link>
            ) : null}
            {isMachineryCommand ? (
              <Link href="/contact" className="machinery-header-rfq hidden xl:inline-flex">
                <span>{t("Build an RFQ")}</span>
                <span aria-hidden="true">&#8599;</span>
              </Link>
            ) : null}
            {!isTextileAtelier ? (
            <Link href={signedIn ? "/account" : "/login"} className={isAtelierHeader ? "aurelia-concierge-link group hidden items-center lg:flex" : "group hidden items-center gap-2.5 text-slate-950 transition hover:text-[var(--header-primary)] lg:flex"}>
              {isAtelierHeader ? (
                <>
                  <span className="aurelia-gem-mark" aria-hidden="true">◇</span>
                  <span className="aurelia-utility-label hidden flex-col xl:flex">
                    <span>{t("Private client")}</span>
                    <small>{signedIn ? t("View profile") : t("Enter salon")}</small>
                  </span>
                </>
              ) : (
                <>
                  <HeaderIcon><AccountIcon /></HeaderIcon>
                  <span className="hidden flex-col leading-tight xl:flex">
                    <span className="text-xs font-extrabold">{t("My Account")}</span>
                    <span className="mt-0.5 text-[10px] font-medium text-slate-500">{signedIn ? t("View profile") : `${t("Login")} / ${t("Register")}`}</span>
                  </span>
                </>
              )}
            </Link>
            ) : null}

            {isTextileAtelier ? (
              <Link href={signedIn ? "/account" : "/login"} className="textile-login-link group hidden items-center gap-2.5 text-slate-950 transition hover:text-[var(--header-primary)] lg:flex">
                <HeaderIcon><AccountIcon /></HeaderIcon>
                <span className="hidden flex-col leading-tight xl:flex">
                  <span className="text-xs font-extrabold">{t(signedIn ? "Account" : "Login")}</span>
                  <span className="mt-0.5 text-[10px] font-medium text-slate-500">{signedIn ? t("View profile") : t("Login / Register")}</span>
                </span>
              </Link>
            ) : (
              <WishlistHeaderLink languageCode={languageCode} displayMode={isAtelierHeader ? "atelier" : "default"} />
            )}

            <MiniCart languageCode={languageCode} displayMode={isTextileAtelier ? "textile-utility" : isAtelierHeader ? "atelier" : "default"} />

              </>
            )}

            <details className="group relative lg:hidden">
              <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 text-slate-900 marker:hidden" aria-label={t("Open menu")}>
                <MenuIcon />
              </summary>
              <div className="absolute right-0 top-full z-[120] mt-3 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <nav aria-label={t("Mobile navigation")} className="grid">
                  {links.map((item, index) => {
                    const isTextileWishlist = isTextileAtelier && (item.href === "/wishlist" || item.protectedWishlist);
                    const isTextileCart = isTextileAtelier && item.href === "/cart";
                    if (isTextileWishlist) {
                      return (
                        <WishlistHeaderLink
                          key={`${item.href}-${item.label}-${index}`}
                          languageCode={languageCode}
                          displayMode="mobile-nav"
                          directNavigation
                          active={index === activeLinkIndex}
                        />
                      );
                    }
                    if (isTextileCart) {
                      return (
                        <MiniCart
                          key={`${item.href}-${item.label}-${index}`}
                          languageCode={languageCode}
                          displayMode="mobile-nav"
                          directNavigation
                          active={index === activeLinkIndex}
                        />
                      );
                    }
                    return (
                      <Link
                        key={`${item.href}-${item.label}-${index}`}
                        href={item.href}
                        onClick={item.protectedWishlist ? (event) => {
                          event.preventDefault();
                          window.location.assign(customerLoginHrefWithCurrentContext("/wishlist"));
                        } : undefined}
                        className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${index === activeLinkIndex ? "bg-[var(--header-soft)] text-[var(--header-primary)]" : "text-slate-700 hover:bg-slate-50 hover:text-[var(--header-primary)]"}`}
                      >
                        {t(item.label)}
                      </Link>
                    );
                  })}
                  <div className="my-1 border-t border-slate-100" />
                  <Link href={signedIn ? "/account" : "/login"} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {isAtelierHeader ? (signedIn ? t("Private client profile") : t("Enter private salon")) : (signedIn ? t("My Account") : t("Login / Register"))}
                  </Link>
                  {!isTextileAtelier ? <Link href={signedIn ? "/wishlist" : "/login?next=%2Fwishlist"} onClick={signedIn ? undefined : (event) => {
                    event.preventDefault();
                    window.location.assign(customerLoginHrefWithCurrentContext("/wishlist"));
                  }} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {isAtelierHeader ? t("Saved pieces") : t("Wishlist")}
                  </Link> : null}
                </nav>
              </div>
            </details>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <SearchForm t={t} industryName={industryName} suggestions={visibleCategoryLinks} mobile compactLuxury={isFootwearAtelier} textileAtelier={isTextileAtelier} />
        </div>
      </div>

      <div className={`hidden border-t border-slate-200 bg-white lg:block ${isTextileAtelier ? "textile-nav-shell" : ""} ${isPlantWorksControl ? "plantworks-nav-shell" : ""}`}>
        <nav aria-label={t("Main navigation")} className={`storefront-header-nav mx-auto flex h-[58px] max-w-[1536px] items-stretch justify-center gap-5 overflow-visible px-8 xl:gap-8 ${isTextileAtelier ? "textile-nav" : ""} ${isPlantWorksControl ? "plantworks-nav" : ""}`}>
          {links.map((item, index) => {
            const isActive = index === activeLinkIndex;
            const isNew = item.label.toLowerCase().includes("new arrival");
            const isAtelierCollection = isAtelierHeader && item.label.toLowerCase().includes("collection");
            const isCategoryNav = item.label.toLowerCase().includes("categor");
            const isTextileWishlist = isTextileAtelier && (item.href === "/wishlist" || item.protectedWishlist);
            const isTextileCart = isTextileAtelier && item.href === "/cart";
            if (isTextileWishlist) {
              return (
                <WishlistHeaderLink
                  key={`${item.href}-${item.label}-${index}`}
                  languageCode={languageCode}
                  displayMode="nav"
                  directNavigation
                  active={isActive}
                />
              );
            }
            if (isTextileCart) {
              return (
                <MiniCart
                  key={`${item.href}-${item.label}-${index}`}
                  languageCode={languageCode}
                  displayMode="nav"
                  directNavigation
                  active={isActive}
                />
              );
            }
            if (isCategoryNav) {
              return (
                <StorefrontCategoryMenu
                  key={`${item.href}-${item.label}-${index}`}
                  label={t(item.label)}
                  href={item.href}
                  active={isActive}
                  title={t("Shop by category")}
                  subtitle={t("Browse the complete catalogue")}
                  viewAllLabel={t("View all categories")}
                  entries={visibleCategoryLinks.map((entry) => ({
                    ...entry,
                    label: t(entry.label),
                    description: t(entry.description),
                  }))}
                  emptyLabel={t("Browse all categories")}
                />
              );
            }
            if (!isAtelierCollection) {
              return (
                <Link
                  key={`${item.href}-${item.label}-${index}`}
                  href={item.href}
                  onClick={item.protectedWishlist ? (event) => {
                    event.preventDefault();
                    window.location.assign(customerLoginHrefWithCurrentContext("/wishlist"));
                  } : undefined}
                  className={`group relative flex shrink-0 items-center gap-2 px-1 text-xs font-bold transition ${isActive ? "text-[var(--header-primary)]" : "text-slate-800 hover:text-[var(--header-primary)]"}`}
                >
                  {t(item.label)}
                  {isNew ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm">HOT</span> : null}
                  <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[var(--header-primary)] transition-transform ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} aria-hidden="true" />
                </Link>
              );
            }
            return (
              <AureliaCollectionsMenu
                key={`${item.href}-${item.label}-${index}`}
                label={t(item.label)}
                menuLabel={t("Collections menu")}
                title={t("THE AURELIA EDIT")}
                links={AURELIA_COLLECTION_LINKS.map((entry) => ({ ...entry, label: t(entry.label) }))}
                active={isActive}
              />
            );
          })}
        </nav>
      </div>
    </header>
  );
}
