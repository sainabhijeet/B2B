import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  price?: string;
  description?: string;
  /** Theme-relative URLs or absolute paths (already resolved by template loader). */
  gallery?: unknown;
  languageCode?: string;
};

function normalizeGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export default function ProductDetail({ themeKey, title, price, description, gallery: galleryRaw, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  const gallery = normalizeGallery(galleryRaw);
  const heading = title?.trim() || t("Product");
  const priceLabel = price?.trim() || "";
  const body = description?.trim() || "";
  const accent =
    themeKey === "textile"
      ? "border-rose-200 bg-rose-50/40"
      : themeKey === "electronics"
        ? "border-slate-200 bg-slate-50/60"
        : themeKey === "classic-b2b"
          ? "border-slate-300 bg-white shadow-sm"
          : "border-amber-200 bg-amber-50/30";

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className={`grid gap-8 rounded-2xl border p-6 md:grid-cols-2 md:p-8 ${accent}`}>
        <div className="space-y-3">
          {gallery.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {gallery.slice(0, 4).map((src, i) => (
                <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl object-cover shadow-sm" />
              ))}
            </div>
          ) : (
            <div className="aspect-square w-full max-w-md rounded-xl bg-white/60 shadow-inner" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{heading}</h1>
          {priceLabel ? <p className="mt-3 text-xl font-medium text-slate-800">{priceLabel}</p> : null}
          {body ? <p className="mt-4 text-sm leading-relaxed text-slate-600">{body}</p> : null}
        </div>
      </div>
    </section>
  );
}
