import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import MiniCart from "@/components/cart/MiniCart";
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
} & Record<string, unknown>;

const DEFAULT_NAV = ["Home", "Categories", "Products", "About", "Blog", "FAQ", "Contact"];

function hrefForNavLabel(label: string, languageCode?: string): string {
  const l = label.toLowerCase();
  const candidates = {
    home: ["home", translate("Home", languageCode)],
    category: ["categor", translate("Categories", languageCode)],
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
  if (has(candidates.product)) return "/product";
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
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700" aria-hidden="true">
      {children}
    </span>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 7.5 9 5.25 9-5.25M12 12.75V22M4.5 5.25 12 1l7.5 4.25v9.5L12 19l-7.5-4.25v-9.5Z" />
    </svg>
  );
}

function SearchForm({ t, mobile = false }: { t: (text: string) => string; mobile?: boolean }) {
  return (
    <form action="/search" role="search" className={mobile ? "flex w-full" : "hidden min-w-0 flex-1 md:flex"}>
      <label htmlFor={mobile ? "mobile-store-search" : "desktop-store-search"} className="sr-only">
        {t("Search products")}
      </label>
      <div className="flex w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-50 shadow-sm transition focus-within:border-[var(--header-primary)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[color:var(--header-primary)]/15">
        <input
          id={mobile ? "mobile-store-search" : "desktop-store-search"}
          name="q"
          type="search"
          placeholder={t("Search products, brands and categories")}
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="flex items-center justify-center px-4 text-white transition hover:brightness-95"
          style={{ backgroundColor: "var(--header-primary)" }}
          aria-label={t("Search")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
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
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const headerPrimary = cssColor(primaryColor, "var(--theme-primary)");
  const headerSecondary = cssColor(secondaryColor, "var(--theme-secondary)");
  const labels = Array.isArray(nav) && nav.length > 0 ? nav : DEFAULT_NAV;
  const links = labels
    .map((label) => ({ label: String(label), href: hrefForNavLabel(String(label), languageCode) }))
    .filter((item, index, all) => item.href !== "/cart" && all.findIndex((candidate) => candidate.href === item.href) === index);
  const brandName = logoText?.trim() || industryName?.trim() || t("Storefront");
  const brandCaption = industryName?.trim() && industryName.trim() !== brandName ? t(industryName.trim()) : "";
  const accountLabel = signedIn ? t("My account") : t("Login");
  const headerStyle = {
    "--header-primary": headerPrimary,
    "--header-secondary": headerSecondary,
  } as CSSProperties;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm" style={headerStyle}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center gap-3 py-3 lg:gap-7">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5 text-slate-950" aria-label={`${brandName} ${t("Home")}`}>
            {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImageUrl.trim()} alt={brandName} className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-0.5 sm:h-11 sm:w-auto sm:max-w-[150px]" />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-black text-white"
                style={{ backgroundColor: "var(--header-primary)" }}
                aria-hidden="true"
              >
                {brandName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="flex min-w-0 max-w-44 flex-col sm:max-w-56">
              <span className="truncate text-sm font-extrabold leading-tight sm:text-base">{brandName}</span>
              {brandCaption ? <span className="mt-0.5 truncate text-[11px] font-medium text-slate-500 sm:text-xs">{brandCaption}</span> : null}
            </span>
          </Link>

          <SearchForm t={t} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href={signedIn ? "/account" : "/login"} className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 xl:flex">
              <HeaderIcon><AccountIcon /></HeaderIcon>
              <span className="max-w-24 leading-tight">{accountLabel}</span>
            </Link>
            <Link href="/orders" className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 lg:flex">
              <HeaderIcon><BoxIcon /></HeaderIcon>
              <span>{t("Orders")}</span>
            </Link>
            <Link href="/wishlist" className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 lg:flex">
              <HeaderIcon><HeartIcon /></HeaderIcon>
              <span>{t("Wishlist")}</span>
            </Link>
            <MiniCart languageCode={languageCode} />

            <details className="group relative lg:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-700 marker:hidden hover:bg-slate-50" aria-label={t("Open menu")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <nav aria-label={t("Mobile navigation")} className="grid">
                  {links.map((item) => (
                    <Link key={`${item.href}-${item.label}`} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[var(--header-primary)]">
                      {t(item.label)}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-slate-100" />
                  <Link href={signedIn ? "/account" : "/login"} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{accountLabel}</Link>
                  <Link href="/orders" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("Orders")}</Link>
                  <Link href="/wishlist" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("Wishlist")}</Link>
                </nav>
              </div>
            </details>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <SearchForm t={t} mobile />
        </div>
      </div>

      <div className="hidden border-t border-white/15 text-white lg:block" style={{ backgroundColor: "var(--header-primary)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6">
          <nav aria-label={t("Main navigation")} className="flex min-w-0 items-center overflow-x-auto">
            {links.map((item) => (
              <Link key={`${item.href}-${item.label}`} href={item.href} className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-white/90 transition hover:border-[var(--header-secondary)] hover:bg-white/10 hover:text-white">
                {t(item.label)}
              </Link>
            ))}
          </nav>
          <Link href="/contact" className="shrink-0 text-xs font-semibold text-white/85 hover:text-white">
            {t("Need help?")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
