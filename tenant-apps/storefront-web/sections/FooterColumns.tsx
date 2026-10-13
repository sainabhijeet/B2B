import Link from "next/link";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";

type FooterLink = string | {
  label?: string;
  title?: string;
  text?: string;
  url?: string;
  href?: string;
};

type FooterColumn = {
  heading?: string;
  title?: string;
  links?: FooterLink[];
};

type SocialLink = {
  label?: string;
  title?: string;
  url?: string;
  href?: string;
};

type Props = {
  themeKey?: ThemeKey;
  variant?: string;
  title?: string;
  logoText?: string;
  logoImageUrl?: string;
  industryName?: string;
  tagline?: string;
  description?: string;
  columns?: FooterColumn[];
  socialLinks?: SocialLink[];
  copyright?: string;
  languageCode?: string;
};

type NormalizedLink = { label: string; href: string };
type NormalizedColumn = { heading: string; links: NormalizedLink[] };

const DEFAULT_COLUMNS: NormalizedColumn[] = [
  {
    heading: "Shop",
    links: [
      { label: "Categories", href: "/category" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "My account", href: "/account" },
      { label: "Orders", href: "/orders" },
      { label: "Cart", href: "/cart" },
    ],
  },
  {
    heading: "Help center",
    links: [
      { label: "Need help?", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Login", href: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
    ],
  },
];

function hrefForLabel(label: string): string {
  const value = label.trim().toLowerCase();
  if (value.includes("categor")) return "/category";
  if (value.includes("product") || value.includes("catalog") || value === "shop") return "/category";
  if (value.includes("wishlist") || value.includes("favorite")) return "/wishlist";
  if (value.includes("cart") || value.includes("basket")) return "/cart";
  if (value.includes("order")) return "/orders";
  if (value.includes("account") || value.includes("profile")) return "/account";
  if (value.includes("login") || value.includes("sign in")) return "/login";
  if (value.includes("about") || value.includes("story")) return "/about";
  if (value.includes("blog") || value.includes("article")) return "/blog";
  if (value.includes("faq") || value.includes("help")) return "/faq";
  if (value.includes("contact") || value.includes("support")) return "/contact";
  return "/";
}

function normalizeColumns(columns: FooterColumn[] | undefined): NormalizedColumn[] {
  if (!Array.isArray(columns) || columns.length === 0) return DEFAULT_COLUMNS;

  const normalized = columns.map((column) => {
    const heading = String(column.heading ?? column.title ?? "").trim();
    const links = (Array.isArray(column.links) ? column.links : []).map((link) => {
      const label = typeof link === "string"
        ? link.trim()
        : String(link.label ?? link.title ?? link.text ?? "").trim();
      const configuredHref = typeof link === "string" ? "" : String(link.url ?? link.href ?? "").trim();
      return { label, href: configuredHref || hrefForLabel(label) };
    }).filter((link) => link.label);
    return { heading, links };
  }).filter((column) => column.heading || column.links.length > 0);

  return normalized.length > 0 ? normalized : DEFAULT_COLUMNS;
}

function isExternal(href: string): boolean {
  return /^(?:https?:)?\/\//iu.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

function FooterLinkItem({ href, children }: { href: string; children: React.ReactNode }) {
  const className = "inline-flex py-1 text-sm text-slate-300 transition hover:translate-x-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
  if (isExternal(href)) {
    return <a href={href} className={className} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{children}</a>;
  }
  return <Link href={href || "/"} className={className}>{children}</Link>;
}

function SocialIcon({ label }: { label: string }) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "S";
  return <span aria-hidden="true" className="text-xs font-extrabold">{initial}</span>;
}

export default function FooterColumns({
  title,
  logoText,
  logoImageUrl,
  industryName,
  tagline,
  description,
  columns,
  socialLinks,
  copyright,
  languageCode,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const blocks = normalizeColumns(columns);
  const brandName = logoText?.trim() || t("Storefront");
  const brandDescription = tagline?.trim()
    || description?.trim()
    || title?.trim()
    || industryName?.trim()
    || t("Complete ecommerce theme for modern marketplaces.");
  const year = new Date().getFullYear();
  const copyrightText = copyright?.trim() || `© ${year} ${brandName}. ${t("All rights reserved.")}`;
  const socials = (Array.isArray(socialLinks) ? socialLinks : []).map((link) => ({
    label: String(link.label ?? link.title ?? "").trim(),
    href: String(link.url ?? link.href ?? "").trim(),
  })).filter((link) => link.label && link.href);

  return (
    <footer className="border-t border-white/10 bg-slate-950 text-white" aria-label={t("Site footer")}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(220px,1.25fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              {logoImageUrl?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoImageUrl.trim()} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--theme-primary)] text-lg font-black text-white" aria-hidden="true">
                  {brandName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span>
                <span className="block text-lg font-extrabold leading-tight">{brandName}</span>
                {industryName?.trim() && industryName.trim() !== brandName ? (
                  <span className="mt-0.5 block text-xs font-medium text-slate-400">{t(industryName.trim())}</span>
                ) : null}
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">{t(brandDescription)}</p>

            {socials.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2" aria-label={t("Social links")}>
                {socials.map((social) => (
                  <a key={`${social.label}-${social.href}`} href={social.href} target="_blank" rel="noreferrer" aria-label={t(social.label)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:border-white/40 hover:bg-white/10 hover:text-white">
                    <SocialIcon label={social.label} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <nav aria-label={t("Footer navigation")} className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            {blocks.map((block, index) => (
              <div key={`${block.heading}-${index}`}>
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-white">{t(block.heading)}</h2>
                <ul className="mt-4 space-y-1.5">
                  {block.links.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      <FooterLinkItem href={link.href}>{t(link.label)}</FooterLinkItem>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyrightText}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-semibold text-slate-300">{t("Secure payments")}</span>
            <span className="rounded border border-white/15 px-2 py-1 font-bold text-slate-300">UPI</span>
            <span className="rounded border border-white/15 px-2 py-1 font-bold text-slate-300">VISA</span>
            <span className="rounded border border-white/15 px-2 py-1 font-bold text-slate-300">RuPay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
