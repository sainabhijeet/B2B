import Link from "next/link";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";
import { useCustomerSignedIn } from "@/components/auth/CustomerAuthContext";
import { customerLoginHref, customerLoginHrefWithCurrentContext } from "@/lib/customer-login-redirect";

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
  designId?: string;
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
    heading: "Catalogue",
    links: [
      { label: "Categories", href: "/category" },
      { label: "All products", href: "/category" },
      { label: "Offers", href: "/offers" },
      { label: "Buying guide", href: "/buying-guide" },
    ],
  },
  {
    heading: "Buyer help",
    links: [
      { label: "Contact support", href: "/contact" },
      { label: "Frequently asked questions", href: "/faq" },
      { label: "Bulk orders", href: "/bulk-orders" },
      { label: "Shipping information", href: "/shipping" },
      { label: "Returns & refunds", href: "/returns" },
    ],
  },
  {
    heading: "Your account",
    links: [
      { label: "My account", href: "/account" },
      { label: "Track orders", href: "/orders" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Cart", href: "/cart" },
      { label: "Login / Register", href: "/login" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    heading: "Policies",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms & conditions", href: "/terms" },
      { label: "Cancellation policy", href: "/cancellations" },
      { label: "Cookie policy", href: "/cookies" },
    ],
  },
];

function hrefForLabel(label: string): string {
  const value = label.trim().toLowerCase();
  if (value.includes("offer") || value.includes("deal") || value.includes("sale")) return "/offers";
  if (value.includes("bulk") || value.includes("quote")) return "/bulk-orders";
  if (value.includes("shipping") || value.includes("delivery information")) return "/shipping";
  if (value.includes("return") || value.includes("refund")) return "/returns";
  if (value.includes("privacy")) return "/privacy";
  if (value.includes("term") || value.includes("condition")) return "/terms";
  if (value.includes("cancel")) return "/cancellations";
  if (value.includes("cookie")) return "/cookies";
  if (value.includes("buying guide") || value.includes("buyer guide")) return "/buying-guide";
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

function normalizeColumns(columns: FooterColumn[] | undefined, preserveConfiguredStructure = false): NormalizedColumn[] {
  const required = DEFAULT_COLUMNS.map((column) => ({
    ...column,
    links: column.links.map((link) => ({ ...link })),
  }));
  if (!Array.isArray(columns) || columns.length === 0) return required;

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

  if (normalized.length === 0) return required;
  if (preserveConfiguredStructure) return normalized;

  const existingHrefs = new Set(required.flatMap((column) => column.links.map((link) => link.href)));
  normalized.flatMap((column) => column.links).forEach((link) => {
    if (existingHrefs.has(link.href)) return;
    const targetIndex = link.href.startsWith("/account") || link.href.startsWith("/orders") || link.href.startsWith("/cart") || link.href.startsWith("/wishlist") || link.href.startsWith("/login")
      ? 2
      : link.href.startsWith("/about") || link.href.startsWith("/blog")
        ? 3
        : link.href.startsWith("/privacy") || link.href.startsWith("/terms") || link.href.startsWith("/cancel") || link.href.startsWith("/cookies")
          ? 4
          : link.href.startsWith("/contact") || link.href.startsWith("/faq") || link.href.startsWith("/bulk") || link.href.startsWith("/shipping") || link.href.startsWith("/returns")
            ? 1
            : 0;
    required[targetIndex].links.push(link);
    existingHrefs.add(link.href);
  });
  return required;
}

function isExternal(href: string): boolean {
  return /^(?:https?:)?\/\//iu.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

function FooterLinkItem({ href, children }: { href: string; children: React.ReactNode }) {
  const signedIn = useCustomerSignedIn();
  const className = "inline-flex py-1 text-sm text-slate-300 transition hover:translate-x-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
  if (isExternal(href)) {
    return <a href={href} className={className} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{children}</a>;
  }
  const requiresLogin = href === "/wishlist" && !signedIn;
  const destination = requiresLogin ? customerLoginHref("/wishlist") : href || "/";
  return <Link href={destination} className={className} onClick={requiresLogin ? (event) => {
    event.preventDefault();
    window.location.assign(customerLoginHrefWithCurrentContext("/wishlist"));
  } : undefined}>{children}</Link>;
}

function SocialIcon({ label }: { label: string }) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "S";
  return <span aria-hidden="true" className="text-xs font-extrabold">{initial}</span>;
}

export default function FooterColumns({
  designId,
  variant,
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
  const preserveAureliaDesign = designId === "ds-06-web-aurelia-elan";
  const isPantryDepot = designId === "ds-09-web" || variant === "pantry-depot" || variant === "footer-pantry-depot";
  const isClinicalDossier = designId === "ds-11-web" || variant === "clinical-dossier" || variant === "footer-clinical-dossier";
  const isQuarryProcurement = designId === "ds-14-web";
  const isMaterialLedger = designId === "ds-16-web" || variant === "material-ledger" || variant === "footer-material-ledger";
  const preserveConfiguredStructure = preserveAureliaDesign || isPantryDepot;
  const blocks = normalizeColumns(columns, preserveConfiguredStructure);
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

  const mode = (variant ?? "commerce-columns").replace(/^footer-/u, "");
  const brandBlock = (
    <div className="storefront-footer-brand">
      <Link href="/" className="inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        {logoImageUrl?.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoImageUrl.trim()} alt="" className="h-11 w-11 rounded-lg bg-white object-contain p-1" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--theme-primary)] text-lg font-black text-white" aria-hidden="true">{brandName.slice(0, 1).toUpperCase()}</span>
        )}
        <span>
          <span className="block text-lg font-extrabold leading-tight">{brandName}</span>
          {industryName?.trim() && industryName.trim() !== brandName ? <span className="mt-0.5 block text-xs font-medium text-slate-400">{t(industryName.trim())}</span> : null}
        </span>
      </Link>
      <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">{t(brandDescription)}</p>
      {socials.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2" aria-label={t("Social links")}>
          {socials.map((social) => (
            <a key={`${social.label}-${social.href}`} href={social.href} target="_blank" rel="noreferrer" aria-label={t(social.label)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:border-white/40 hover:bg-white/10 hover:text-white"><SocialIcon label={social.label} /></a>
          ))}
        </div>
      ) : null}
    </div>
  );
  const directory = (
    <nav aria-label={t("Footer navigation")} className={`storefront-footer-directory grid grid-cols-2 gap-x-6 gap-y-9 ${preserveConfiguredStructure ? "sm:grid-cols-3" : "sm:grid-cols-3 xl:grid-cols-5"}`}>
      {blocks.map((block, index) => (
        <div key={`${block.heading}-${index}`}>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-white">{t(block.heading)}</h2>
          <ul className="mt-4 space-y-1.5">{block.links.map((link) => <li key={`${link.label}-${link.href}`}><FooterLinkItem href={link.href}>{t(link.label)}</FooterLinkItem></li>)}</ul>
        </div>
      ))}
    </nav>
  );
  const bottomBar = (
    <div className="storefront-footer-bottom mt-10 flex flex-col gap-5 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <p>{copyrightText}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {!preserveAureliaDesign ? <Link href="/privacy" className="transition hover:text-white">{t("Privacy")}</Link> : null}
        {!preserveAureliaDesign ? <Link href="/terms" className="transition hover:text-white">{t("Terms")}</Link> : null}
        <span className="font-semibold text-slate-300">{t("Secure payments")}</span>
        <span className="border border-white/15 px-2 py-1 font-bold text-slate-300">UPI</span><span className="border border-white/15 px-2 py-1 font-bold text-slate-300">VISA</span><span className="border border-white/15 px-2 py-1 font-bold text-slate-300">RuPay</span>
      </div>
    </div>
  );
  const assuranceStrip = (
    <nav aria-label={t("Store services")} className="storefront-footer-signals grid overflow-hidden rounded-2xl border border-white/10 bg-white/[.045] sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["Secure checkout", "Protected payment flow", "/checkout"],
        ["Order tracking", "View order progress", "/orders"],
        ["Bulk order help", "Plan larger requirements", "/bulk-orders"],
        ["Buyer support", "Contact our team", "/contact"],
      ].map(([heading, text, href], index) => (
        <Link key={heading} href={href} className="group flex items-center gap-4 border-white/10 px-5 py-5 transition hover:bg-white/[.06] lg:border-r lg:last:border-r-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary)] text-xs font-black text-white">{String(index + 1).padStart(2, "0")}</span>
          <span><strong className="block text-sm text-white group-hover:text-[var(--theme-secondary)]">{t(heading)}</strong><small className="mt-1 block text-slate-400">{t(text)}</small></span>
        </Link>
      ))}
    </nav>
  );

  if (isClinicalDossier) {
    return (
      <footer className="storefront-footer clinical-dossier-footer" data-footer-variant="clinical-dossier" data-theme-design={designId} aria-label={t("Site footer")}>
        <div className="clinical-dossier-footer-shell">
          <div className="clinical-dossier-footer-desk">
            <div>
              <p>{t("CLINICAL PROCUREMENT DESK")}</p>
              <h2>{t("A buyer workspace built around clear clinical sourcing.")}</h2>
            </div>
            <div className="clinical-dossier-footer-actions">
              <Link href="/category">{t("Open catalog index")} <span aria-hidden="true">&#8594;</span></Link>
              <Link href="/bulk-orders">{t("Prepare bulk request")}</Link>
            </div>
          </div>
          <div className="clinical-dossier-footer-grid">
            <section className="clinical-dossier-footer-brand">
              <span className="clinical-dossier-footer-label">{t("IDENTITY / SUPPLY NETWORK")}</span>
              {brandBlock}
              <div className="clinical-dossier-brand-colors" aria-label={t("Selected brand colours")}><i /><i /><span>{t("Distributor-selected palette")}</span></div>
            </section>
            <section className="clinical-dossier-footer-directory">
              <span className="clinical-dossier-footer-label">{t("BUYER DIRECTORY / INDEX")}</span>
              {directory}
            </section>
            <aside className="clinical-dossier-footer-register" aria-label={t("Procurement shortcuts")}>
              <span className="clinical-dossier-footer-label">{t("QUICK REGISTER")}</span>
              <Link href="/orders"><span>{t("Track orders")}</span></Link>
              <Link href="/wishlist"><span>{t("Saved equipment")}</span></Link>
              <Link href="/contact"><span>{t("Sourcing support")}</span></Link>
            </aside>
          </div>
          <div className="clinical-dossier-footer-bottom">{bottomBar}</div>
        </div>
      </footer>
    );
  }

  if (isPantryDepot) {
    return (
      <footer className="storefront-footer pantry-depot-footer" data-footer-variant="pantry-depot" data-theme-design={designId} aria-label={t("Site footer")}>
        <div className="pantry-depot-shell">
          <div className="pantry-depot-desk">
            <div>
              <p>{t("REPLENISHMENT DESK")}</p>
              <h2>{t("Plan the next shelf reset in one place.")}</h2>
              <span>{t("Compare grocery aisles, case quantities and trade offers before you build an order.")}</span>
            </div>
            <div className="pantry-depot-actions">
              <Link href="/category">{t("Browse aisles")} <span aria-hidden="true">&#8594;</span></Link>
              <Link href="/bulk-orders">{t("Plan a bulk order")}</Link>
            </div>
          </div>

          <div className="pantry-depot-grid">
            <div className="pantry-depot-brand-wrap">
              <span className="pantry-depot-label">{t("PANTRY / TRADE SUPPLY")}</span>
              {brandBlock}
              <div className="pantry-depot-palette" aria-label={t("Brand colour palette")}>
                <i /><i /><span>{t("Your selected brand colours")}</span>
              </div>
            </div>
            <div className="pantry-depot-directory-wrap">
              <span className="pantry-depot-label">{t("BUYER DIRECTORY")}</span>
              {directory}
            </div>
            <aside className="pantry-depot-shortcuts" aria-label={t("Buyer shortcuts")}>
              <span className="pantry-depot-label">{t("QUICK DESK")}</span>
              <Link href="/orders"><strong>01</strong><span>{t("Track orders")}</span></Link>
              <Link href="/wishlist"><strong>02</strong><span>{t("Saved products")}</span></Link>
              <Link href="/contact"><strong>03</strong><span>{t("Buyer support")}</span></Link>
            </aside>
          </div>

          <div className="pantry-depot-bottom">{bottomBar}</div>
        </div>
      </footer>
    );
  }

  if (isQuarryProcurement) {
    const procurementSignals = [
      ["PAY", "Secure checkout", "Protected payment flow", "/checkout"],
      ["TRK", "Order tracking", "View order progress", "/orders"],
      ["MOQ", "Quantity desk", "Plan larger requirements", "/bulk-orders"],
      ["ASK", "Buyer support", "Contact our trade desk", "/contact"],
    ];

    return (
      <footer className="storefront-footer quarry-command-footer" data-footer-variant="quarry-command" data-theme-design={designId} aria-label={t("Site footer")}>
        <div className="quarry-footer-shell">
          <section className="quarry-footer-desk">
            <div className="quarry-footer-mark" aria-hidden="true"><span>BQ</span><small>14 / WEB</small></div>
            <div className="quarry-footer-pitch">
              <p>{t("PROJECT PROCUREMENT DESK")}</p>
              <h2>{t("Build the next order from one coordinated material desk.")}</h2>
              <span>{t("Compare materials, prepare quantities and align delivery requirements before the order reaches site.")}</span>
            </div>
            <div className="quarry-footer-actions">
              <Link href="/category">{t("Open material index")} <span aria-hidden="true">&#8599;</span></Link>
              <Link href="/bulk-orders">{t("Prepare an RFQ")} <span aria-hidden="true">&#8594;</span></Link>
            </div>
          </section>

          <nav className="quarry-footer-signals" aria-label={t("Procurement services")}>
            {procurementSignals.map(([code, heading, text, href]) => (
              <Link href={href} key={code}>
                <span>{code}</span>
                <strong>{t(heading)}</strong>
                <small>{t(text)}</small>
                <i aria-hidden="true">&#8599;</i>
              </Link>
            ))}
          </nav>

          <div className="quarry-footer-main">
            <section className="quarry-footer-brand-panel">
              <span className="quarry-footer-label">{t("DISTRIBUTOR IDENTITY / MATERIAL SUPPLY")}</span>
              {brandBlock}
              <div className="quarry-footer-palette" aria-label={t("Selected brand colours")}>
                <i /><i /><span>{t("Distributor-selected palette active")}</span>
              </div>
            </section>
            <section className="quarry-footer-directory-panel">
              <div className="quarry-footer-directory-head">
                <span className="quarry-footer-label">{t("BUYER DIRECTORY / QUICK ROUTES")}</span>
                <small>{t("Catalog, account and policy access")}</small>
              </div>
              {directory}
            </section>
          </div>

          <div className="quarry-footer-bottom">{bottomBar}</div>
        </div>
      </footer>
    );
  }

  if (isMaterialLedger) {
    const sourcingRoutes = [
      ["SPEC", "Material matching", "Shortlist by grade and application", "/category"],
      ["MOQ", "Quantity planning", "Compare sample and volume tiers", "/category"],
      ["RFQ", "Bulk sourcing", "Prepare a larger requirement", "/bulk-orders"],
      ["TRK", "Order visibility", "Follow order progress", "/orders"],
    ];

    return (
      <footer className="storefront-footer material-ledger-footer" data-footer-variant="material-ledger" data-theme-design={designId} aria-label={t("Site footer")}>
        <div className="material-ledger-shell">
          <section className="material-ledger-desk">
            <div>
              <p>{t("MATERIAL SOURCING DESK / MB-16")}</p>
              <h2>{t("Move from specification to supply with fewer handoffs.")}</h2>
              <span>{t("Compare materials, plan quantities and prepare the next request from one technical buying workspace.")}</span>
            </div>
            <div className="material-ledger-actions">
              <Link href="/category">{t("Open material index")} <span aria-hidden="true">&#8599;</span></Link>
              <Link href="/bulk-orders">{t("Build a bulk RFQ")} <span aria-hidden="true">&#8594;</span></Link>
            </div>
          </section>

          <nav className="material-ledger-routes" aria-label={t("Material sourcing routes")}>
            {sourcingRoutes.map(([code, heading, text, href]) => (
              <Link href={href} key={code}>
                <span>{code}</span>
                <strong>{t(heading)}</strong>
                <small>{t(text)}</small>
                <i aria-hidden="true">&#8599;</i>
              </Link>
            ))}
          </nav>

          <div className="material-ledger-main">
            <section className="material-ledger-brand-panel">
              <span className="material-ledger-label">{t("DISTRIBUTOR IDENTITY / SPECIALTY MATERIALS")}</span>
              {brandBlock}
              <div className="material-ledger-palette" aria-label={t("Selected brand colours")}>
                <i /><i /><span>{t("Distributor-selected palette active")}</span>
              </div>
            </section>
            <section className="material-ledger-directory-panel">
              <div className="material-ledger-directory-head">
                <span className="material-ledger-label">{t("BUYER DIRECTORY / QUICK ROUTES")}</span>
                <small>{t("Catalog, account, support and policy access")}</small>
              </div>
              {directory}
            </section>
          </div>

          <div className="material-ledger-bottom">{bottomBar}</div>
        </div>
      </footer>
    );
  }

  let composition: React.ReactNode;
  if (mode === "minimal") {
    composition = (
      <div className="py-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2.35fr)]">{brandBlock}{directory}</div>
        {bottomBar}
      </div>
    );
  } else if (mode === "brand-story") {
    composition = <div className="py-16 text-center"><div className="mx-auto max-w-2xl [&_.storefront-footer-brand>a]:justify-center [&_.storefront-footer-brand>p]:mx-auto">{brandBlock}</div><div className="mx-auto mt-12 max-w-4xl border-y border-white/15 py-10 text-left">{directory}</div>{bottomBar}</div>;
  } else if (mode === "newsletter-led") {
    composition = (
      <div className="py-12">
        <div className="grid items-end gap-6 border-b border-white/15 pb-10 lg:grid-cols-[1fr_1.1fr]"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--theme-secondary)]">{t("Trade updates")}</p><h2 className="mt-2 text-3xl font-bold">{t("New products and buying guides")}</h2></div><form action="/contact" className="flex"><input name="email" type="email" required placeholder={t("Business email address")} className="min-w-0 flex-1 border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400" /><button className="bg-[var(--theme-primary)] px-5 py-3 text-sm font-bold text-white">{t("Subscribe")}</button></form></div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_2.4fr]">{brandBlock}{directory}</div>{bottomBar}
      </div>
    );
  } else if (mode === "trade-directory") {
    composition = (
      <div className="py-12">
        <div className="mb-12 grid items-center gap-6 border-b border-white/15 pb-10 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--theme-secondary)]">{t("Business buying desk")}</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">{t("Plan your next bulk order with confidence")}</h2><p className="mt-2 text-sm text-slate-400">{t("Compare categories, quantities and availability from one place.")}</p></div><div className="flex flex-wrap gap-3"><Link href="/category" className="bg-[var(--theme-primary)] px-5 py-3 text-sm font-bold text-white">{t("Browse catalog")}</Link><Link href="/contact" className="border border-white/30 px-5 py-3 text-sm font-bold text-white">{t("Contact sales")}</Link></div></div>
        <div className="grid gap-12 lg:grid-cols-[1fr_2.2fr]">{brandBlock}{directory}</div>{bottomBar}
      </div>
    );
  } else if (mode === "marketplace") {
    composition = <div className="py-12"><div className="grid gap-10 lg:grid-cols-[1fr_3fr]">{brandBlock}{directory}</div>{bottomBar}</div>;
  } else if (mode === "service-desk") {
    composition = <div className="py-12"><div className="grid gap-10 lg:grid-cols-[1fr_2.5fr]">{brandBlock}{directory}</div>{bottomBar}</div>;
  } else {
    composition = <div className="py-12"><div className="grid gap-10 lg:grid-cols-[minmax(220px,1.25fr)_minmax(0,3fr)] lg:gap-16">{brandBlock}{directory}</div>{bottomBar}</div>;
  }

  return (
    <footer className="storefront-footer border-t border-white/10 bg-slate-950 text-white" data-footer-variant={mode} data-theme-design={designId} aria-label={t("Site footer")}>
      <div className={`storefront-footer-inner mx-auto max-w-7xl px-4 sm:px-6 ${preserveAureliaDesign ? "" : "pt-9"}`}>
        {preserveAureliaDesign ? null : assuranceStrip}
        {composition}
      </div>
    </footer>
  );
}
