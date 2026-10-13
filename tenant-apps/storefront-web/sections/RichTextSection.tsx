import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  body?: string;
  align?: string;
  languageCode?: string;
};

export default function RichTextSection({ eyebrow, title, body, align, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const alignment = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  const text =
    body?.trim() ||
    "Add content to this section.";
  const paras = text.split(/\n\n+/g).map((paragraph) => t(paragraph));
  return (
    <section className={`mx-auto max-w-4xl px-4 py-14 sm:py-20 ${alignment}`}>
      {eyebrow?.trim() ? (
        <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "var(--theme-primary)" }}>
          {t(eyebrow.trim())}
        </p>
      ) : null}
      {title?.trim() ? <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t(title.trim())}</h2> : null}
      <div className={`mt-5 space-y-4 text-base leading-7 text-slate-600 ${title?.trim() ? "" : "mt-0"}`}>
        {paras.map((p, i) => (
          <p key={i}>
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
