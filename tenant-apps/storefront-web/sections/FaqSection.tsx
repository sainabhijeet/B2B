import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Item = { question?: string; answer?: string };

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items?: unknown;
  languageCode?: string;
};

function normalizeItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((row): Item | null => {
    if (!row || typeof row !== "object") return null;
    const o = row as Record<string, unknown>;
    const q = typeof o.question === "string" ? o.question : typeof o.q === "string" ? o.q : "";
    const a = typeof o.answer === "string" ? o.answer : typeof o.a === "string" ? o.a : "";
    if (!q.trim() && !a.trim()) return null;
    return { question: q.trim(), answer: a.trim() };
  });
  return mapped.filter((x): x is Item => x != null);
}

export default function FaqSection({ eyebrow, title, subtitle, items: itemsRaw, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  const items = normalizeItems(itemsRaw);
  const defaults: Item[] = [
    { question: t("Do you ship across India?"), answer: t("Yes — standard and express options at checkout.") },
    { question: t("What is your return window?"), answer: t("Most items: 7 days unused with tags intact.") },
  ];
  const rows = items.length ? items : defaults;
  return (
    <section id="retailer-faq" className="bg-white py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-44 lg:self-start">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-primary)]">{t(eyebrow?.trim() || "Help center")}</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t(title?.trim() || "Frequently asked questions")}</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{t(subtitle?.trim() || "Quick answers for product discovery, retailer pricing and order management.")}</p>
          <a href="/contact" className="mt-6 inline-flex rounded-full bg-[var(--theme-primary)] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:brightness-95">{t("Contact support")}</a>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {rows.map((row, i) => (
            <details key={i} className="group py-1" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-extrabold text-slate-900 marker:hidden sm:text-base">
                <span>{t(row.question ?? "")}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-normal text-slate-700 transition group-open:rotate-45 group-open:bg-[color:var(--theme-primary)]/10 group-open:text-[var(--theme-primary)]" aria-hidden="true">+</span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 text-sm leading-6 text-slate-600">{t(row.answer ?? "")}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
