import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Item = { question?: string; answer?: string };

type Props = {
  themeKey?: ThemeKey;
  title?: string;
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

export default function FaqSection({ title, items: itemsRaw, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  const items = normalizeItems(itemsRaw);
  const defaults: Item[] = [
    { question: t("Do you ship across India?"), answer: t("Yes — standard and express options at checkout.") },
    { question: t("What is your return window?"), answer: t("Most items: 7 days unused with tags intact.") },
  ];
  const rows = items.length ? items : defaults;
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-2xl font-semibold text-slate-900">{title?.trim() || t("Frequently asked questions")}</h2>
      <dl className="mt-8 space-y-6">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <dt className="font-medium text-slate-900">{row.question}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-slate-600">{row.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
