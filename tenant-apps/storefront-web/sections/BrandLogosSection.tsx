import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  logos?: unknown;
  languageCode?: string;
};

type Logo = { src: string; alt: string };

function urls(raw: unknown): Logo[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [{ src: item.trim(), alt: "" }];
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const value = item as { image?: unknown; imageUrl?: unknown; src?: unknown; url?: unknown; name?: unknown };
    const src = [value.image, value.imageUrl, value.src]
      .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
    return src ? [{ src: src.trim(), alt: typeof value.name === "string" ? value.name : "" }] : [];
  });
}

export default function BrandLogosSection({ title, logos, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const list = urls(logos);
  return (
    <section className="border-y border-slate-100 bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {t(title?.trim() || "As featured in")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-8 opacity-80">
          {list.length
            ? list.map((logo, i) => <img key={i} src={logo.src} alt={logo.alt} className="h-8 max-w-[120px] object-contain grayscale" />)
            : [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-24 rounded bg-slate-200" title={t("Add logo image URLs in theme settings")} />
              ))}
        </div>
      </div>
    </section>
  );
}
