import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  primaryCta?: string;
  primaryHref?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  languageCode?: string;
};

export default function HeroBanner({
  themeKey,
  eyebrow,
  title,
  subtitle,
  image,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  languageCode,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const heading = t(title?.trim() ?? "");
  const sub = t(subtitle?.trim() ?? "");
  return (
    <section
      className="overflow-hidden py-14 md:py-16"
      style={{
        background:
          "linear-gradient(135deg, var(--theme-surface), color-mix(in srgb, var(--theme-secondary) 42%, white))",
      }}
      data-theme-key={themeKey}
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[minmax(0,0.95fr)_minmax(280px,1.05fr)] md:items-center lg:gap-12">
        <div className="min-w-0 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--theme-primary)" }}>
            {eyebrow?.trim() ? t(eyebrow.trim()) : null}
          </p>
          <h1
            className="mt-3 max-w-[11ch] break-words text-4xl font-semibold leading-[0.98] sm:max-w-[14ch] sm:text-5xl lg:text-6xl"
            style={{ color: "var(--theme-text)" }}
          >
            {heading}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7" style={{ color: "var(--theme-muted)" }}>
            {sub}
          </p>
          {primaryCta?.trim() || secondaryCta?.trim() ? (
            <div className="mt-7 flex flex-wrap gap-3">
              {primaryCta?.trim() ? (
                <a
                  href={primaryHref?.trim() || "/category"}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold"
                  style={{ background: "var(--theme-primary)", color: "var(--theme-primary-contrast)" }}
                >
                  {t(primaryCta.trim())}
                </a>
              ) : null}
              {secondaryCta?.trim() ? (
                <a
                  href={secondaryHref?.trim() || "/category"}
                  className="rounded-full border px-5 py-2.5 text-sm font-semibold"
                  style={{ borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
                >
                  {t(secondaryCta.trim())}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          {image ? (
            <img src={image} alt="" className="h-64 w-full rounded-lg object-cover shadow-sm sm:h-72" />
          ) : (
            <div
              className="h-64 rounded-lg shadow-sm sm:h-72"
              style={{ background: "color-mix(in srgb, var(--theme-surface) 78%, white)" }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
