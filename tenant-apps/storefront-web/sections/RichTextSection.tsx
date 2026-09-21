import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  body?: string;
};

export default function RichTextSection({ title, body, languageCode }: Props & { languageCode?: string }) {
  const t = (text: string) => translate(text, languageCode);
  const text =
    body?.trim() ||
    "Add content to this section.";
  const paras = text.split(/\n\n+/g).map((paragraph) => t(paragraph));
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      {title?.trim() ? <h2 className="text-2xl font-semibold text-slate-900">{t(title.trim())}</h2> : null}
      <div className={`prose prose-slate mt-4 max-w-none text-sm leading-relaxed text-slate-700 ${title?.trim() ? "" : "mt-0"}`}>
        {paras.map((p, i) => (
          <p key={i} className="mb-4 last:mb-0">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
