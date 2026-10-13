import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import MiniCart from "@/components/cart/MiniCart";
import WishlistHeaderLink from "@/components/wishlist/WishlistHeaderLink";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  variant?: string;
  logoText?: string;
  /** Injected from `tenant_branding` via `GET /themes/storefront/current`. */
  logoImageUrl?: string;
  industryName?: string;
  nav?: string[];
  languageCode?: string;
  primaryColor?: string;
  secondaryColor?: string;
  signedIn?: boolean;
  currentPath?: string;
} & Record<string, unknown>;

const DEFAULT_NAV = ["Home", "Categories", "Brands", "New Arrivals", "Deals", "Blog", "About", "Contact"];

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
  };
  const has = (values: string[]) => values.some((value) => value && l.includes(value.toLowerCase()));
  if (has(candidates.home)) return "/";
  if (has(candidates.category)) return "/category";
  if (has(candidates.newArrivals)) return "/category?sort=newest";
  if (has(candidates.deals)) return "/category?sort=price_asc";
  if (has(candidates.brand)) return "/category";
  if (has(candidates.product)) return "/category";
  if (has(candidates.wishlist)) return "/wishlist";
  if (has(candidates.cart)) return "/cart";
  if (has(candidates.orders)) return "/orders";
  if (has(candidates.account)) return "/account";
  if (has(candidates.login)) return "/login";
  if (has(candidates.about)) return "/about";
  if (has(candidates.blog)) return "/blog";
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

function SearchForm({ t, industryName, mobile = false }: { t: (text: string) => string; industryName?: string; mobile?: boolean }) {
  return (
    <form action="/search" role="search" className={mobile ? "flex w-full" : "hidden min-w-0 flex-1 md:flex"}>
      <label htmlFor={mobile ? "mobile-store-search" : "desktop-store-search"} className="sr-only">
        {t("Search products")}
      </label>
      <div className="flex h-[52px] w-full items-stretch overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition focus-within:border-[var(--header-primary)] focus-within:ring-4 focus-within:ring-[color:var(--header-primary)]/10">
        <input
          id={mobile ? "mobile-store-search" : "desktop-store-search"}
          name="q"
          type="search"
          placeholder={t("Search products, brands and more...")}
          className="min-w-0 flex-1 bg-transparent px-5 text-[13px] font-medium text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 sm:px-6"
        />
        {!mobile ? (
          <label className="hidden h-full min-w-[155px] items-center border-l border-slate-200 px-5 text-xs font-semibold text-slate-700 lg:flex">
            <span className="sr-only">{t("Category")}</span>
            <select name="category" defaultValue="" className="min-w-0 flex-1 appearance-none bg-transparent pr-2 outline-none">
              <option value="">{t("All Categories")}</option>
              {industryName ? <option value={industryName}>{t(industryName)}</option> : null}
            </select>
            <ChevronDownIcon />
          </label>
        ) : null}
        <button
          type="submit"
          className="flex w-[58px] shrink-0 items-center justify-center rounded-r-[27px] text-white transition hover:brightness-95 sm:w-[64px]"
          style={{ backgroundColor: "var(--header-primary)" }}
          aria-label={t("Search")}
        >
          <SearchIcon />
        </button>
      </div>
    </form>
  );
}

export default function Header({
  logoText,
  logoImageUrl,
  industryName,
  nav,
  languageCode,
  primaryColor,
  secondaryColor,
  signedIn = false,
  currentPath = "/",
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const headerPrimary = cssColor(primaryColor, "#f97300");
  const headerSecondary = cssColor(secondaryColor, "#ffb24a");
  const labels = Array.isArray(nav) && nav.length > 0 ? nav : DEFAULT_NAV;
  const links = labels
    .map((label) => ({ label: String(label), href: hrefForNavLabel(String(label), languageCode) }))
    .filter((item) => item.href !== "/cart");
  const brandName = logoText?.trim() || industryName?.trim() || t("Storefront");
  const brandCaption = industryName?.trim() && industryName.trim() !== brandName ? t(industryName.trim()) : "";
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

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-[0_5px_18px_rgba(15,23,42,0.05)]" style={headerStyle}>
      <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[82px] items-center gap-4 py-3 lg:gap-6 xl:min-h-[92px] xl:gap-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
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

          <SearchForm t={t} industryName={industryName} />

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4 xl:gap-5">
            <Link href={signedIn ? "/account" : "/login"} className="group hidden items-center gap-2.5 text-slate-950 transition hover:text-[var(--header-primary)] lg:flex">
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span className="hidden flex-col leading-tight xl:flex">
                <span className="text-xs font-extrabold">{t("My Account")}</span>
                <span className="mt-0.5 text-[10px] font-medium text-slate-500">{signedIn ? t("View profile") : `${t("Login")} / ${t("Register")}`}</span>
              </span>
            </Link>

            <WishlistHeaderLink languageCode={languageCode} />

            <MiniCart languageCode={languageCode} />

            <details className="group relative lg:hidden">
              <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 text-slate-900 marker:hidden" aria-label={t("Open menu")}>
                <MenuIcon />
              </summary>
              <div className="absolute right-0 top-full z-50 mt-3 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                <nav aria-label={t("Mobile navigation")} className="grid">
                  {links.map((item, index) => (
                    <Link
                      key={`${item.href}-${item.label}-${index}`}
                      href={item.href}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${index === activeLinkIndex ? "bg-[var(--header-soft)] text-[var(--header-primary)]" : "text-slate-700 hover:bg-slate-50 hover:text-[var(--header-primary)]"}`}
                    >
                      {t(item.label)}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-slate-100" />
                  <Link href={signedIn ? "/account" : "/login"} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{signedIn ? t("My Account") : t("Login / Register")}</Link>
                  <Link href="/wishlist" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("Wishlist")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <SearchForm t={t} industryName={industryName} mobile />
        </div>
      </div>

      <div className="hidden border-t border-slate-200 bg-white lg:block">
        <nav aria-label={t("Main navigation")} className="mx-auto flex h-[58px] max-w-[1536px] items-stretch justify-center gap-5 overflow-x-auto px-8 xl:gap-8">
          {links.map((item, index) => {
            const isActive = index === activeLinkIndex;
            const isNew = item.label.toLowerCase().includes("new arrival");
            return (
              <Link
                key={`${item.href}-${item.label}-${index}`}
                href={item.href}
                className={`group relative flex shrink-0 items-center gap-2 px-1 text-xs font-bold transition ${isActive ? "text-[var(--header-primary)]" : "text-slate-800 hover:text-[var(--header-primary)]"}`}
              >
                {t(item.label)}
                {isNew ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm">HOT</span> : null}
                <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[var(--header-primary)] transition-transform ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
