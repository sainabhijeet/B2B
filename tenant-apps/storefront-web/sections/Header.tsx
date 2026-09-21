import Link from "next/link";
import MiniCart from "@/components/cart/MiniCart";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  variant?: string;
  logoText?: string;
  /** Injected from `tenant_branding` via `GET /themes/storefront/current` + template merge. */
  logoImageUrl?: string;
  industryName?: string;
  nav?: string[];
  languageCode?: string;
  primaryColor?: string;
  secondaryColor?: string;
} & Record<string, unknown>;

function hrefForNavLabel(label: string, languageCode?: string): string {
  const l = label.toLowerCase();
  const candidates = {
    home: ["home", translate("Home", languageCode)],
    category: ["categor", translate("Categories", languageCode)],
    product: ["product", "catalog", "shop", translate("Products", languageCode), translate("Catalog", languageCode)],
    wishlist: ["wishlist", "favorite", translate("Wishlist", languageCode)],
    cart: ["cart", "basket", translate("Cart", languageCode)],
    orders: ["order", translate("Orders", languageCode)],
    login: ["login", "sign", translate("Login", languageCode), translate("Log in", languageCode)],
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
  if (has(candidates.login)) return "/login";
  if (has(candidates.blog)) return "/blog";
  if (has(candidates.faq)) return "/faq";
  if (has(candidates.contact)) return "/contact";
  return "/";
}

function cssColor(value: string | undefined, fallback: string): string {
  const color = typeof value === "string" ? value.trim() : "";
  return color || fallback;
}

export default function Header({
  logoText,
  logoImageUrl,
  industryName,
  nav,
  languageCode,
  primaryColor,
  secondaryColor,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const headerPrimary = cssColor(primaryColor, "var(--theme-primary)");
  const headerSecondary = cssColor(secondaryColor, "var(--theme-secondary)");
  const links =
    Array.isArray(nav) && nav.length > 0
      ? nav.map((label) => ({ label: String(label), href: hrefForNavLabel(String(label), languageCode) }))
      : [];
  return (
    <header
      className="border-b"
      style={{
        background: headerPrimary,
        borderColor: headerSecondary,
        boxShadow: `inset 0 -4px 0 ${headerSecondary}`,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white">
          {typeof logoImageUrl === "string" && logoImageUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoImageUrl.trim()} alt="" className="h-9 w-auto max-w-[160px] rounded bg-white/90 object-contain p-0.5" />
          ) : null}
          <span className="flex min-w-0 flex-col">
            <span>{logoText?.trim()}</span>
            {industryName?.trim() ? (
              <span className="text-xs font-medium text-white/75">
                {t(industryName.trim())}
              </span>
            ) : null}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-white/85">
          {links.map((item) => (
            <Link key={item.label} href={item.href} className="hover:opacity-80">
              {t(item.label)}
            </Link>
          ))}
          <MiniCart languageCode={languageCode} />
        </nav>
      </div>
    </header>
  );
}
