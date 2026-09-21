import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";

type Row = { icon?: string; title?: string; text?: string };

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  items?: unknown;
};

function normalize(raw: unknown): Row[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((x): Row | null => {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    const row: Row = {
      icon: typeof o.icon === "string" ? o.icon : "",
      title: typeof o.title === "string" ? o.title : "",
      text: typeof o.text === "string" ? o.text : typeof o.description === "string" ? o.description : "",
    };
    return (row.title ?? "").trim() || (row.text ?? "").trim() ? row : null;
  });
  return mapped.filter((x): x is Row => x != null);
}

function isImageSource(value: string): boolean {
  return /^(?:https?:\/\/|data:image\/|\/|[^\s]+\.(?:svg|png|jpe?g|webp)(?:[?#].*)?$)/iu.test(value.trim());
}

export default function IconListSection({ title, items, languageCode }: Props & { languageCode?: string }) {
  const t = (text: string) => translate(text, languageCode);
  const rows = normalize(items);
  const demo: Row[] = [
    { title: "Free shipping", text: "On orders above your store threshold." },
    { title: "Secure checkout", text: "Cards, UPI, and wallets." },
    { title: "Easy returns", text: "Hassle-free policy." },
  ];
  const list = rows.length ? rows : demo;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-center text-xl font-semibold text-slate-900">{t(title?.trim() || "Why shop with us")}</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((row, i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            {row.icon && isImageSource(row.icon) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.icon} alt="" className="mx-auto h-10 w-10 object-contain" />
            ) : row.icon ? (
              <p className="text-2xl" aria-hidden>{row.icon}</p>
            ) : (
              <p className="text-2xl text-slate-300" aria-hidden>◆</p>
            )}
            <p className="mt-2 font-medium text-slate-900">{t(row.title ?? "")}</p>
            <p className="mt-1 text-xs text-slate-600">{t(row.text ?? "")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
