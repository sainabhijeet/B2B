import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  background?: string;
  languageCode?: string;
};

export default function PromoStripSection({ eyebrow, title, subtitle, description, image, ctaLabel, ctaUrl, background, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const bg =
    background?.trim() ||
    "linear-gradient(90deg, var(--theme-primary), color-mix(in srgb, var(--theme-primary) 72%, var(--theme-secondary)))";
  return (
    <section className="relative z-10 py-4" style={{ background: bg, color: "#fff" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 text-center sm:flex-row sm:text-left">
        <div className="flex min-w-0 items-center gap-4">
          {image ? <img src={image} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" /> : null}
          <div>
            {eyebrow?.trim() ? <p className="text-[10px] uppercase tracking-[0.16em] opacity-80">{t(eyebrow.trim())}</p> : null}
            <p className="text-sm font-semibold leading-5 tracking-wide drop-shadow-sm">
              {t(title?.trim() || "Special offer")}
            </p>
            <p className="max-w-xl text-xs leading-5 opacity-90 drop-shadow-sm">
            {t(subtitle?.trim() || description?.trim() || "Discover our latest offers.")}
            </p>
          </div>
        </div>
        {ctaLabel?.trim() && ctaUrl?.trim() ? (
          <a href={ctaUrl.trim()} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900">
            {t(ctaLabel.trim())}
          </a>
        ) : null}
      </div>
    </section>
  );
}
