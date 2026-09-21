import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Lock, ReceiptText, Settings, ShoppingCart, WalletCards } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchStoreUrlPreview } from "@/lib/distributorOnboardingApi";
import {
  fetchStorefrontMobileThemeBundle,
  fetchSelectedThemeInfo,
  formatWebsiteBuilderError,
  type StorefrontMobileThemeBundle,
  type SelectedThemeInfo,
} from "@/lib/websiteBuilderApi";
import { getApiOrigin } from "@/lib/apiBase";
import { getAuthSession } from "@/lib/authStorage";
import { fetchMobileAppSettings, fetchWhiteLabelStatus } from "@/lib/distributorPanelApi";
import { translatePreviewText, translatePreviewValue } from "@/lib/localizePreviewText";
import LiveThemeEditorControls from "@/pages/website-builder/LiveThemeEditorControls";
import {
  THEME_PREVIEW_MESSAGE,
  previewLanguageContract,
  type ThemePreviewState,
} from "@/lib/themePreviewContract";

const tabs: Array<{ to: string; label: string }> = [
  { to: "/website-builder/home", label: "Homepage" },
  { to: "/website-builder/category", label: "Category Page" },
  { to: "/website-builder/product", label: "Product Page" },
  { to: "/website-builder/theme", label: "Storefront theme" },
  { to: "/website-builder/theme-settings", label: "Theme Settings" },
];

const mobileBottomNav = [
  { label: "Home", icon: Home },
  { label: "Cart", icon: ShoppingCart },
  { label: "Orders", icon: ReceiptText },
  { label: "Credit", icon: WalletCards },
  { label: "Settings", icon: Settings },
  { label: "Auth", icon: Lock },
];

type MobilePreviewSection = {
  id?: string;
  type?: string;
  settings?: Record<string, unknown>;
};

type MobilePreviewHint = {
  themeName?: string;
  slug?: string | null;
  previewImage?: string | null;
};

type LocaleDictionary = Record<string, string>;

function objectValue(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function stringValue(raw: unknown, fallback = ""): string {
  return typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
}

function stringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

function firstString(settings: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = stringValue(settings[key]);
    if (value) return value;
  }
  return fallback;
}

function firstImage(settings: Record<string, unknown>, resolveImage: (raw: unknown) => string): string {
  const direct = firstString(settings, [
    "image",
    "imageUrl",
    "image_url",
    "heroImage",
    "hero_image",
    "backgroundImage",
    "background_image",
    "bannerImage",
    "banner_image",
    "thumbnail",
    "cover",
    "src",
  ]);
  if (direct) return resolveImage(direct);
  for (const value of Object.values(settings)) {
    if (typeof value === "string" && /\.(?:avif|gif|jpe?g|png|webp|svg)(?:[?#].*)?$/i.test(value)) {
      return resolveImage(value);
    }
  }
  return "";
}

function listFromSettings(settings: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const list = stringList(settings[key]);
    if (list.length) return list;
  }
  return [];
}

function labelFromAssetPath(src: string, fallback: string): string {
  const file = src.split(/[\\/]/u).pop()?.replace(/\.[a-z0-9]+(?:[?#].*)?$/iu, "") ?? "";
  const cleaned = file
    .replace(/^(category|product|hero|banner)[-_]+/iu, "")
    .replace(/[-_]+/gu, " ")
    .trim();
  return cleaned ? cleaned.replace(/\b\w/gu, (m) => m.toUpperCase()) : fallback;
}

function templateSections(bundle: StorefrontMobileThemeBundle | null): MobilePreviewSection[] {
  const tpl = objectValue(bundle?.preview?.homeTemplate);
  const sections = tpl.sections;
  return Array.isArray(sections)
    ? sections.filter((x): x is MobilePreviewSection => Boolean(x && typeof x === "object"))
    : [];
}

function palette(bundle: StorefrontMobileThemeBundle | null) {
  const colorsToken = objectValue(bundle?.preview?.tokens?.colors);
  const nested = objectValue(colorsToken.colors);
  const colors = Object.keys(nested).length ? nested : colorsToken;
  return {
    primary: stringValue(bundle?.branding?.primary_color, stringValue(colors.primary, "#1565C0")),
    secondary: stringValue(bundle?.branding?.secondary_color, stringValue(colors.secondary, "#F59E0B")),
    surface: stringValue(colors.surface, "#F8FAFC"),
    ink: stringValue(colors.ink, "#0F172A"),
    muted: stringValue(colors.muted, "#64748B"),
  };
}

function assetUrl(bundle: StorefrontMobileThemeBundle | null, raw: unknown): string {
  const value = stringValue(raw);
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  const base = stringValue(bundle?.preview?.assetBaseUrl).replace(/\/$/u, "");
  return base ? `${base}/${value.replace(/^\.?\//u, "")}` : value;
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function flattenLocaleDictionary(value: unknown, prefix = ""): LocaleDictionary {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: LocaleDictionary = {};
  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") {
      out[nextKey] = child;
    } else if (child && typeof child === "object" && !Array.isArray(child)) {
      Object.assign(out, flattenLocaleDictionary(child, nextKey));
    }
  }
  return out;
}

async function fetchMobileThemeLocale(bundle: StorefrontMobileThemeBundle | null, languageCode: string): Promise<LocaleDictionary> {
  const assetBaseUrl = stringValue(bundle?.preview?.assetBaseUrl).replace(/\/$/u, "");
  const code = stringValue(languageCode, "en").toLowerCase().split("-")[0] || "en";
  if (!assetBaseUrl) return {};
  const res = await fetch(`${assetBaseUrl}/locales/${encodeURIComponent(code)}.json`, { cache: "no-store" });
  if (!res.ok) return {};
  return flattenLocaleDictionary(await res.json());
}

function mobileApiBaseUrl(): string {
  const configured = getApiOrigin();
  if (configured) return `${configured}/api/v1`;
  return `${window.location.origin}/api/v1`;
}

function MobileTemplateSection({
  section,
  bundle,
  colors,
  layout,
  t,
}: {
  section: MobilePreviewSection;
  bundle: StorefrontMobileThemeBundle | null;
  colors: ReturnType<typeof palette>;
  layout: string;
  t: (text: string) => string;
}) {
  const type = stringValue(section.type, "section").toLowerCase();
  const settings = objectValue(section.settings);
  const resolveImage = (raw: unknown) => assetUrl(bundle, raw);
  const image = firstImage(settings, resolveImage);
  const title = firstString(settings, ["title", "heading", "headline", "name", "label"]);
  const subtitle = firstString(settings, ["subtitle", "body", "description", "text", "caption"]);
  const eyebrow = firstString(settings, ["eyebrow", "kicker", "badge"]);
  const cta = firstString(settings, ["primaryCta", "primary_cta", "cta", "ctaText", "buttonText"]);

  if (/header/i.test(type)) {
    const logoText = firstString(settings, ["logoText", "logo_text", "brand", "title"], "Store");
    const nav = listFromSettings(settings, ["nav", "links", "menu"]);
    return (
      <section className="border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-lg font-black" style={{ color: colors.ink }}>{t(logoText)}</p>
          <span className="rounded-full px-2 py-1 text-[10px] font-bold text-white" style={{ background: colors.primary }}>{t("Menu")}</span>
        </div>
        {nav.length ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {nav.slice(0, 5).map((item) => (
              <span key={item} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold" style={{ color: colors.muted }}>
                {t(item)}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  if (/hero|banner|cover|splash/i.test(type)) {
    if (!image && !title && !subtitle && !eyebrow && !cta) return null;
    return (
      <section className="p-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {image ? <img src={image} alt="" className="h-40 w-full object-cover" /> : <div className="h-32" style={{ background: colors.primary }} />}
          <div className="space-y-2 p-4">
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.secondary }}>{t(eyebrow)}</p> : null}
            {title ? <h2 className="text-2xl font-black leading-tight" style={{ color: colors.ink }}>{t(title)}</h2> : null}
            {subtitle ? <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>{t(subtitle)}</p> : null}
            {cta ? <button className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: colors.primary }}>{t(cta)}</button> : null}
          </div>
        </div>
      </section>
    );
  }

  if (/categor/i.test(type)) {
    const images = listFromSettings(settings, ["images", "categoryImages", "items"]).map((img) => assetUrl(bundle, img)).filter(Boolean);
    const labels = listFromSettings(settings, ["labels", "categoryLabels", "titles", "names"]);
    return (
      <section className="px-4 pb-4">
        {title ? <h3 className="mb-3 text-base font-bold" style={{ color: colors.ink }}>{t(title)}</h3> : null}
        {subtitle ? <p className="-mt-2 mb-3 text-xs leading-relaxed" style={{ color: colors.muted }}>{t(subtitle)}</p> : null}
        <div className="grid grid-cols-3 gap-2">
          {(images.length ? images : ["", "", ""]).slice(0, 6).map((src, idx) => (
            <div key={`${src}-${idx}`} className="overflow-hidden rounded-xl bg-white p-2 text-center shadow-sm">
              <div className="aspect-square overflow-hidden rounded-lg" style={{ background: colors.surface }}>
                {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <p className="mt-2 truncate text-[11px] font-semibold" style={{ color: colors.ink }}>
                {t(labels[idx] ?? labelFromAssetPath(src, `Category ${idx + 1}`))}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (/product|collection|grid|catalog/i.test(type)) {
    const images = listFromSettings(settings, ["images", "productImages", "items"]).map((img) => assetUrl(bundle, img)).filter(Boolean);
    const labels = listFromSettings(settings, ["labels", "productLabels", "titles", "names"]);
    const prices = listFromSettings(settings, ["prices", "productPrices"]);
    const isList = layout === "list" || layout === "fast_order";
    return (
      <section className="px-4 pb-4">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.muted }}>{t(eyebrow)}</p> : null}
            {title ? <h3 className="text-lg font-bold leading-tight" style={{ color: colors.ink }}>{t(title)}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.muted }}>{t(subtitle)}</p> : null}
          </div>
          {cta ? <span className="rounded-full px-2 py-1 text-[10px] font-semibold text-white" style={{ background: colors.primary }}>{t(cta)}</span> : null}
        </div>
        <div className={isList ? "space-y-2" : "grid grid-cols-2 gap-3"}>
          {(images.length ? images : ["", "", "", ""]).slice(0, 6).map((src, idx) =>
            isList ? (
              <div key={`${src}-${idx}`} className="flex gap-3 rounded-xl bg-white p-2 shadow-sm">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg" style={{ background: colors.surface }}>
                  {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: colors.ink }}>{t(labels[idx] ?? labelFromAssetPath(src, `Product ${idx + 1}`))}</p>
                  <p className="mt-1 text-xs" style={{ color: colors.muted }}>{t(prices[idx] ?? subtitle)}</p>
                </div>
              </div>
            ) : (
              <div key={`${src}-${idx}`} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="aspect-square" style={{ background: colors.surface }}>
                  {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-semibold" style={{ color: colors.ink }}>{t(labels[idx] ?? labelFromAssetPath(src, `Product ${idx + 1}`))}</p>
                  {prices[idx] ? <p className="mt-1 text-[11px] font-bold" style={{ color: colors.primary }}>{t(prices[idx])}</p> : null}
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    );
  }

  if (/promo|offer|sale|coupon|cta/i.test(type)) {
    return (
      <section className="m-4 rounded-2xl p-4 text-white" style={{ background: colors.primary }}>
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{t(eyebrow)}</p> : null}
        {title ? <p className="text-base font-bold">{t(title)}</p> : null}
        {subtitle ? <p className="mt-1 text-xs opacity-85">{t(subtitle)}</p> : null}
      </section>
    );
  }

  if (/testimonial|review/i.test(type)) {
    const quote = firstString(settings, ["quote", "text", "body"], subtitle);
    const author = firstString(settings, ["author", "name", "caption"]);
    return (
      <section className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold leading-relaxed" style={{ color: colors.ink }}>{quote ? `"${t(quote)}"` : t("Customer feedback")}</p>
        {author ? <p className="mt-2 text-xs font-semibold" style={{ color: colors.primary }}>{t(author)}</p> : null}
      </section>
    );
  }

  if (/icon|benefit|feature-list/i.test(type)) {
    const items = Array.isArray(settings.items) ? settings.items : [];
    return (
      <section className="px-4 pb-4">
        {title ? <h3 className="mb-3 text-base font-bold" style={{ color: colors.ink }}>{t(title)}</h3> : null}
        <div className="space-y-2">
          {items.slice(0, 4).map((raw, idx) => {
            const item = objectValue(raw);
            const itemTitle = firstString(item, ["title", "heading", "label"], `Point ${idx + 1}`);
            const itemText = firstString(item, ["text", "body", "description"]);
            return (
              <div key={`${itemTitle}-${idx}`} className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-sm font-bold" style={{ color: colors.ink }}>{t(itemTitle)}</p>
                {itemText ? <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.muted }}>{t(itemText)}</p> : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (/footer/i.test(type)) {
    const columns = Array.isArray(settings.columns) ? settings.columns : [];
    return (
      <section className="mx-4 mb-4 rounded-2xl bg-slate-900 p-4 text-white">
        <p className="text-base font-bold">{t(firstString(settings, ["title", "heading"], "More from this store"))}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {columns.slice(0, 4).map((raw, idx) => {
            const column = objectValue(raw);
            const heading = firstString(column, ["heading", "title"], `Column ${idx + 1}`);
            const links = listFromSettings(column, ["links", "items"]);
            return (
              <div key={`${heading}-${idx}`} className="min-w-0">
                <p className="truncate text-xs font-bold">{t(heading)}</p>
                {links.slice(0, 4).map((link) => (
                  <p key={link} className="mt-1 truncate text-[11px] text-slate-300">{t(link)}</p>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="m-4 overflow-hidden rounded-2xl bg-white shadow-sm">
      {image ? <img src={image} alt="" className="h-36 w-full object-cover" /> : null}
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.muted }}>{type.replace(/[-_]/g, " ")}</p>
        {title ? <p className="mt-1 font-bold" style={{ color: colors.ink }}>{t(title)}</p> : null}
        {subtitle ? <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.muted }}>{t(subtitle)}</p> : null}
      </div>
    </section>
  );
}

function MobileThemeLivePreview({
  bundle,
  selectedTheme,
  languageCode,
  localeDictionary,
  previewHint,
  appName,
}: {
  bundle: StorefrontMobileThemeBundle | null;
  selectedTheme: SelectedThemeInfo;
  languageCode: string;
  localeDictionary?: LocaleDictionary;
  previewHint?: MobilePreviewHint | null;
  appName?: string;
}) {
  const bundleLocaleDictionary = objectValue(bundle?.preview?.locale);
  const t = (text: string) => {
    const key = text.trim();
    const dictionary = { ...bundleLocaleDictionary, ...(localeDictionary ?? {}) };
    const resolve = (candidate: string, depth = 0): string | null => {
      if (depth > 3) return null;
      const translated = dictionary[candidate] ?? dictionary[`_aliases.${candidate}`];
      if (typeof translated !== "string" || !translated.trim()) return null;
      const value = translated.trim();
      if (value === "REVIEW_REQUIRED") return null;
      if (dictionary[value] && value !== candidate) return resolve(value, depth + 1);
      return value;
    };
    return resolve(key) ?? translatePreviewText(text, languageCode);
  };
  const colors = palette(bundle);
  const sections = translatePreviewValue(templateSections(bundle), languageCode);
  const themeName =
    previewHint?.themeName ?? selectedTheme?.mobileTheme?.themeName ?? stringValue(bundle?.preview?.themeName, t("Mobile theme"));
  const fallbackPreviewImage = previewHint?.previewImage ?? selectedTheme?.mobileTheme?.previewImage ?? "";
  const logo = stringValue(bundle?.branding?.logo);
  const resolvedAppName = stringValue(appName, selectedTheme?.mobileTheme?.themeName ?? stringValue(bundle?.preview?.themeName, "App"));
  const tagline = stringValue(bundle?.branding?.tagline);
  const layout = stringValue(bundle?.base_layout, "grid").replace(/-/g, "_");
  const compact = bundle?.config?.spacing === "compact" || bundle?.config?.compact === true;

  if (!sections.length && fallbackPreviewImage) {
    return (
      <div className="h-[744px] w-[390px] overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              {logo ? (
                <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm" />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: colors.primary }} />
              )}
              <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.muted }}>
                {t("Mobile theme")}
              </p>
              <p className="truncate font-semibold" style={{ color: colors.ink }}>
                {resolvedAppName}
              </p>
              </div>
            </div>
            <span className="rounded-full px-2 py-1 text-[10px] font-medium text-white" style={{ background: colors.primary }}>
              {t("App")}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ background: colors.surface }}>
            <section className="p-4">
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <img src={fallbackPreviewImage} alt="" className="block w-full object-contain object-top" />
                <div className="space-y-2 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.secondary }}>
                    {themeName}
                  </p>
                  <h2 className="text-2xl font-black leading-tight" style={{ color: colors.ink }}>
                    {resolvedAppName}
                  </h2>
                  {tagline ? (
                    <p className="text-sm leading-relaxed" style={{ color: colors.muted }}>
                      {t(tagline)}
                    </p>
                  ) : null}
                  <button className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: colors.primary }}>
                    {t("Shop Deals")}
                  </button>
                </div>
              </div>
            </section>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-2 pb-2 pt-2">
            <div className="grid grid-cols-6 gap-1">
              {mobileBottomNav.map((item, idx) => {
                const Icon = item.icon;
                const active = idx === 0;
                return (
                  <div
                    key={item.label}
                    className={`flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 ${active ? "bg-indigo-100" : ""}`}
                    style={active ? { color: colors.primary } : { color: colors.muted }}
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={2.4} />
                    <span className="mt-1 max-w-full truncate text-[10px] font-semibold leading-none">{t(item.label)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[744px] w-[390px] overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {logo ? (
              <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm" />
            ) : (
              <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: colors.primary }} />
            )}
            <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.muted }}>
              {t("Mobile theme")}
            </p>
            <p className="truncate font-semibold" style={{ color: colors.ink }}>
              {resolvedAppName}
            </p>
            </div>
          </div>
          <span className="rounded-full px-2 py-1 text-[10px] font-medium text-white" style={{ background: colors.primary }}>
            {t("App")}
          </span>
        </div>
        <div className={compact ? "flex-1 overflow-y-auto py-3" : "flex-1 overflow-y-auto py-4"} style={{ background: colors.surface }}>
          {sections.map((section, idx) => (
            <MobileTemplateSection
              key={section.id ?? `${section.type ?? "section"}-${idx}`}
              section={section}
              bundle={bundle}
              colors={colors}
              layout={layout}
              t={t}
            />
          ))}
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-2 pb-2 pt-2">
          <div className="grid grid-cols-6 gap-1">
            {mobileBottomNav.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === 0;
              return (
                <div
                  key={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 ${
                    active ? "bg-indigo-100" : ""
                  }`}
                  style={active ? { color: colors.primary } : { color: colors.muted }}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2.4} />
                  <span className="mt-1 max-w-full truncate text-[10px] font-semibold leading-none">
                    {t(item.label)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WebsiteBuilderLayout() {
  const location = useLocation();
  const [previewBaseUrl, setPreviewBaseUrl] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<SelectedThemeInfo>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [themePreviewMode, setThemePreviewMode] = useState<"web" | "mobile" | "combo">("web");
  const [previewLoading, setPreviewLoading] = useState(true);
  const [mobileBundle, setMobileBundle] = useState<StorefrontMobileThemeBundle | null>(null);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("en");
  const [mobileLocaleDictionary, setMobileLocaleDictionary] = useState<LocaleDictionary>({});
  const [mobilePreviewHint, setMobilePreviewHint] = useState<MobilePreviewHint | null>(null);
  const [mobileAppName, setMobileAppName] = useState("");
  const [previewSubdomain, setPreviewSubdomain] = useState("");
  const [editorState, setEditorState] = useState<ThemePreviewState>({});
  const [editorCompare, setEditorCompare] = useState(false);
  const [editorZoom, setEditorZoom] = useState(100);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const mobilePreviewIframeRef = useRef<HTMLIFrameElement>(null);
  const liveEditorEnabled = String(import.meta.env.VITE_THEME_LIVE_EDITOR_ENABLED ?? "").toLowerCase() === "true";

  useEffect(() => {
    let cancelled = false;

    const resolvePreviewBase = (preview: Awaited<ReturnType<typeof fetchStoreUrlPreview>>) => {
      let resolved = "";
      const explicitStorefrontOrigin =
        (import.meta.env.VITE_STOREFRONT_PREVIEW_URL as string | undefined)?.trim() ||
        (import.meta.env.VITE_STOREFRONT_DEV_ORIGIN as string | undefined)?.trim();
      if (explicitStorefrontOrigin) {
        resolved = explicitStorefrontOrigin.replace(/\/$/u, "");
      } else if (preview?.devPreviewUrl) {
        resolved = preview.devPreviewUrl.replace(/\/$/u, "");
      }
      return resolved;
    };

    const loadInitial = async () => {
      setMetaError(null);
      try {
        const [preview, theme, appSettings, whiteLabel] = await Promise.all([
          fetchStoreUrlPreview(),
          fetchSelectedThemeInfo(),
          fetchMobileAppSettings().catch(() => null),
          fetchWhiteLabelStatus().catch(() => null),
        ]);
        if (cancelled) return;
        const language = appSettings?.selectedLanguageCode || "en";
        const mobileThemeBundle = await fetchStorefrontMobileThemeBundle(language).catch(() => null);
        if (cancelled) return;
        setPreviewBaseUrl(resolvePreviewBase(preview));
        setPreviewSubdomain(preview?.subdomain || "");
        setSelectedTheme(theme);
        setMobileBundle(mobileThemeBundle);
        setSelectedLanguageCode(language);
        setMobileAppName(whiteLabel?.mobileApp?.appName || "");
      } catch (e) {
        if (!cancelled) {
          setMetaError(formatWebsiteBuilderError(e, "Could not load preview/theme info."));
        }
      }
    };

    void loadInitial();

    const onRefresh = () => {
      setPreviewLoading(true);
      setPreviewNonce((x) => x + 1);
      void fetchSelectedThemeInfo()
        .then((theme) => {
          if (!cancelled) setSelectedTheme(theme);
        })
        .catch(() => {
          /* ignore â€” preview iframe still refreshes */
        });
      void fetchMobileAppSettings()
        .then((settings) => {
          if (cancelled) return;
          const language = settings.selectedLanguageCode || "en";
          setSelectedLanguageCode(language);
          void fetchStorefrontMobileThemeBundle(language)
            .then((bundle) => {
              if (!cancelled) setMobileBundle(bundle);
            })
            .catch(() => undefined);
        })
        .catch(() => undefined);
      void fetchWhiteLabelStatus()
        .then((status) => {
          if (!cancelled) setMobileAppName(status.mobileApp.appName || "");
        })
        .catch(() => undefined);
    };
    const onPreviewMode = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: unknown }>).detail?.mode;
      if (mode === "web" || mode === "mobile" || mode === "combo") {
        setThemePreviewMode(mode);
        setPreviewDevice(mode === "mobile" ? "mobile" : "desktop");
      }
    };
    const onMobilePreviewHint = (event: Event) => {
      const detail = (event as CustomEvent<MobilePreviewHint | null>).detail;
      setMobilePreviewHint(detail && typeof detail === "object" ? detail : null);
    };
    const onLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ selectedLanguageCode?: unknown }>).detail;
      const nextLanguage = stringValue(detail?.selectedLanguageCode, "en").toLowerCase().split("-")[0] || "en";
      setSelectedLanguageCode(nextLanguage);
      setEditorState((current) => ({
        ...current,
        languageCode: nextLanguage,
        languageContract: previewLanguageContract(nextLanguage),
      }));
      void fetchStorefrontMobileThemeBundle(nextLanguage)
        .then((bundle) => {
          if (!cancelled) setMobileBundle(bundle);
        })
        .catch(() => undefined);
      setPreviewLoading(true);
      setPreviewNonce((x) => x + 1);
    };
    window.addEventListener("website-builder:preview-refresh", onRefresh);
    window.addEventListener("website-builder:preview-mode", onPreviewMode);
    window.addEventListener("website-builder:mobile-preview-hint", onMobilePreviewHint);
    window.addEventListener("website-builder:language-change", onLanguageChange);
    return () => {
      cancelled = true;
      window.removeEventListener("website-builder:preview-refresh", onRefresh);
      window.removeEventListener("website-builder:preview-mode", onPreviewMode);
      window.removeEventListener("website-builder:mobile-preview-hint", onMobilePreviewHint);
      window.removeEventListener("website-builder:language-change", onLanguageChange);
    };
  }, []);

  const previewPath = useMemo(() => {
    if (location.pathname.endsWith("/category")) return "/category";
    if (location.pathname.endsWith("/product")) return "/product";
    return "/";
  }, [location.pathname]);

  const activeLanguageCode = editorState.languageContract?.languageCode || editorState.languageCode || selectedLanguageCode || "en";
  const activeLanguageContract = useMemo(
    () => previewLanguageContract(activeLanguageCode, previewNonce),
    [activeLanguageCode, previewNonce],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchStorefrontMobileThemeBundle(activeLanguageCode)
      .then((bundle) => {
        if (!cancelled) setMobileBundle(bundle);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeLanguageCode, previewNonce]);

  useEffect(() => {
    let cancelled = false;
    setMobileLocaleDictionary({});
    void fetchMobileThemeLocale(mobileBundle, activeLanguageCode)
      .then((dictionary) => {
        if (!cancelled) setMobileLocaleDictionary(dictionary);
      })
      .catch(() => {
        if (!cancelled) setMobileLocaleDictionary({});
      });
    return () => {
      cancelled = true;
    };
  }, [activeLanguageCode, mobileBundle]);

  const activePreviewState = useMemo<ThemePreviewState>(
    () => ({
      ...editorState,
      languageCode: activeLanguageContract.languageCode,
      languageContract: activeLanguageContract,
      page: previewPath === "/category" ? "category" : previewPath === "/product" ? "product" : "home",
    }),
    [activeLanguageContract, editorState, previewPath],
  );

  useEffect(() => {
    if (!liveEditorEnabled) return;
    const message = { type: THEME_PREVIEW_MESSAGE, state: activePreviewState };
    previewIframeRef.current?.contentWindow?.postMessage(message, "*");
    mobilePreviewIframeRef.current?.contentWindow?.postMessage(message, "*");
  }, [activePreviewState, liveEditorEnabled]);

  const previewUrl = useMemo(() => {
    if (!previewBaseUrl) return "";
    const base = previewBaseUrl.endsWith("/") ? previewBaseUrl.slice(0, -1) : previewBaseUrl;
    try {
      const url = new URL(`${base}${previewPath}`);
      const tokenTenantId = getAuthSession()?.tenantId ?? null;
      if (tokenTenantId) url.searchParams.set("tenantId", tokenTenantId);
      if (previewSubdomain) url.searchParams.set("tenant", previewSubdomain);
      url.searchParams.set("wbPreview", String(previewNonce));
      if (liveEditorEnabled) {
        url.searchParams.set("previewMode", "1");
        url.searchParams.set("previewLanguage", activeLanguageCode || "en");
      }
      return url.toString();
    } catch {
      return `${base}${previewPath}?wbPreview=${previewNonce}`;
    }
  }, [activeLanguageCode, liveEditorEnabled, previewBaseUrl, previewPath, previewNonce, previewSubdomain]);

  const installedAppPreviewUrl = useMemo(() => {
    const useInstalledPreview =
      (import.meta.env.VITE_USE_INSTALLED_MOBILE_PREVIEW as string | undefined)?.trim() === "true";
    if (!useInstalledPreview) return "";
    const raw = (import.meta.env.VITE_MOBILE_APP_PREVIEW_URL as string | undefined)?.trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      const tokenTenantId = getAuthSession()?.tenantId ?? null;
      const storefrontOrigin = previewBaseUrl ? new URL(previewBaseUrl) : null;
      const tenantSlug = previewSubdomain || (storefrontOrigin ? storefrontOrigin.hostname.split(".")[0] : "");
      if (tokenTenantId) url.searchParams.set("tenantId", tokenTenantId);
      if (tenantSlug) {
        url.searchParams.set("tenant", tenantSlug);
        if (storefrontOrigin) {
          const storefrontHost =
            storefrontOrigin.hostname === "localhost"
              ? `${tenantSlug}.localhost${storefrontOrigin.port ? `:${storefrontOrigin.port}` : ""}`
              : storefrontOrigin.host;
          url.searchParams.set("storefrontHost", storefrontHost);
        }
      }
      url.searchParams.set("apiBaseUrl", mobileApiBaseUrl());
      url.searchParams.set("appLanguage", activeLanguageCode || "en");
      if (liveEditorEnabled) {
        const initialState: ThemePreviewState = {
          languageCode: activeLanguageCode || "en",
          languageContract: activeLanguageContract,
        };
        url.searchParams.set("previewState", encodeURIComponent(JSON.stringify(initialState)));
      }
      url.searchParams.set("appNameB64", base64Utf8(mobileAppName || selectedTheme?.mobileTheme?.themeName || "App"));
      if (selectedTheme?.mobileTheme?.id) url.searchParams.set("themeId", selectedTheme.mobileTheme.id);
      url.searchParams.set("wbPreview", String(previewNonce));
      return url.toString();
    } catch {
      return raw;
    }
  }, [activeLanguageCode, activeLanguageContract, liveEditorEnabled, mobileAppName, previewBaseUrl, previewNonce, previewSubdomain, selectedTheme?.mobileTheme]);

  const showMobileThemePreview =
    location.pathname.endsWith("/theme") &&
    (themePreviewMode === "mobile" || (themePreviewMode === "combo" && previewDevice === "mobile"));

  function refreshPreview() {
    setPreviewLoading(true);
    setPreviewNonce((x) => x + 1);
  }

  return (
    <div>
      <PageHeader
        title="Website Builder"
        description="Edit section content overrides and theme tokens without changing the theme package."
      />
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">Selected Theme</span>
            <span className="font-medium text-slate-900">{selectedTheme?.themeName ? selectedTheme.themeName : "Not selected"}</span>
            <span className="text-slate-500">{selectedTheme?.slug ? `(${selectedTheme.slug})` : ""}</span>
            {selectedTheme?.id ? (
              <span className="font-mono text-[10px] text-slate-400" title="Theme row id from API">
                id {selectedTheme.id.slice(0, 8)}â€¦
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={refreshPreview}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh preview
          </button>
        </div>
        {metaError ? <p className="mt-2 text-xs text-red-700">{metaError}</p> : null}
        {!metaError && previewBaseUrl ? (
          <p className="mt-2 text-xs text-slate-500">
            Preview base: <span className="font-mono">{previewBaseUrl}</span>
          </p>
        ) : null}
      </div>
      <div className="-mx-1 mb-4 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-px px-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                [
                  "whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
                ].join(" ")
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <Outlet />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Preview</p>
              {previewLoading && previewUrl && !showMobileThemePreview ? <span className="text-[10px] text-slate-400">Refreshing...</span> : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`rounded px-2 py-1 text-[10px] font-medium ${previewDevice === "desktop" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`rounded px-2 py-1 text-[10px] font-medium ${previewDevice === "mobile" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                Mobile
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("tablet")}
                className={`rounded px-2 py-1 text-[10px] font-medium ${previewDevice === "tablet" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                Tablet
              </button>
              <button type="button" onClick={refreshPreview} className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-200">
                Refresh
              </button>
              <a
                href={previewUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Full screen
              </a>
            </div>
          </div>
          <LiveThemeEditorControls
            enabled={liveEditorEnabled}
            iframeRef={previewIframeRef}
            previewUrl={previewUrl}
            page={previewPath === "/category" ? "category" : previewPath === "/product" ? "product" : "home"}
            language={activeLanguageCode}
            state={activePreviewState}
            onStateChange={setEditorState}
            onRefresh={refreshPreview}
            compareMode={editorCompare}
            onCompareModeChange={setEditorCompare}
            zoom={editorZoom}
            onZoomChange={setEditorZoom}
          />
          {showMobileThemePreview ? (
            <div className="flex min-h-[760px] justify-center overflow-auto rounded-md bg-slate-100 p-4">
              {installedAppPreviewUrl ? (
                <iframe
                  key={installedAppPreviewUrl}
                  ref={mobilePreviewIframeRef}
                  title="Installed mobile app preview"
                  src={installedAppPreviewUrl}
                  onLoad={() => setPreviewLoading(false)}
                  className="h-[744px] w-[390px] overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm"
                />
              ) : liveEditorEnabled ? (
                <div className="flex h-[744px] w-[390px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
                  Configure <span className="mx-1 font-mono">VITE_MOBILE_APP_PREVIEW_URL</span> with the real Flutter web preview to enable synchronized mobile rendering.
                </div>
              ) : (
                <MobileThemeLivePreview
                  bundle={mobileBundle}
                  selectedTheme={selectedTheme}
                  languageCode={activeLanguageCode}
                  localeDictionary={mobileLocaleDictionary}
                  previewHint={mobilePreviewHint}
                  appName={mobileAppName}
                />
              )}
            </div>
          ) : previewUrl ? (
            <div className="flex min-h-[760px] justify-center gap-3 overflow-auto rounded-md bg-slate-100 p-2">
              {editorCompare && liveEditorEnabled ? (
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">Published baseline</p>
                  <iframe title="Published baseline preview" src={previewUrl.replace(/([?&])previewState=[^&]+/u, "$1")} className="h-[744px] w-full rounded-md border border-slate-200 bg-white shadow-sm" />
                </div>
              ) : null}
              <div className={editorCompare && liveEditorEnabled ? "min-w-0 flex-1" : "w-full"} style={{ transform: `scale(${editorZoom / 100})`, transformOrigin: "top center" }}>
                {editorCompare && liveEditorEnabled ? <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Draft preview</p> : null}
              <iframe
                key={previewUrl}
                ref={previewIframeRef}
                title="Storefront preview"
                src={previewUrl}
                onLoad={() => setPreviewLoading(false)}
                className={`h-[744px] rounded-md border border-slate-200 bg-white shadow-sm transition-all ${previewDevice === "mobile" ? "w-[390px]" : previewDevice === "tablet" ? "w-[768px]" : "w-full"}`}
              />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-600">
              Preview URL not available yet. Ensure the Storefront preview server is running and configure{" "}
              <span className="font-mono">VITE_STOREFRONT_PREVIEW_URL</span>; the tenant slug must match{" "}
              <span className="font-mono">tenants.slug</span> in the DB.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


