import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  subtitle?: string;
  body?: string;
  buttonLabel?: string;
  action?: string;
  buttonHref?: string;
  actionHref?: string;
  href?: string;
  languageCode?: string;
};

export default function CtaBannerSection({
  title,
  subtitle,
  body,
  buttonLabel,
  action,
  buttonHref,
  actionHref,
  href,
  languageCode,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const copy = subtitle?.trim() || body?.trim() || "Short value proposition for your campaign or collection.";
  const label = buttonLabel?.trim() || action?.trim() || "Learn more";
  const target = buttonHref?.trim() || actionHref?.trim() || href?.trim() || "/contact";
  return (
    <section className="py-14" style={{ background: "var(--theme-primary)", color: "var(--theme-primary-contrast)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold">{t(title?.trim() || "Call to action")}</h2>
          <p className="mt-2 max-w-xl text-sm opacity-85">
            {t(copy)}
          </p>
        </div>
        <a
          href={target}
          className="inline-flex shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90"
          style={{ background: "var(--theme-surface)", color: "var(--theme-primary)" }}
        >
          {t(label)}
        </a>
      </div>
    </section>
  );
}
