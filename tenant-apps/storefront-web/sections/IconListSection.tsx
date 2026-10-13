import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";

type Row = { icon?: string; title?: string; text?: string };

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  items?: unknown;
  languageCode?: string;
};

function normalize(raw: unknown): Row[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((item): Row | null => {
    if (!item || typeof item !== "object") return null;
    const value = item as Record<string, unknown>;
    const row: Row = {
      icon: typeof value.icon === "string" ? value.icon : "",
      title: typeof value.title === "string" ? value.title : "",
      text: typeof value.text === "string" ? value.text : typeof value.description === "string" ? value.description : "",
    };
    return (row.title ?? "").trim() || (row.text ?? "").trim() ? row : null;
  });
  return mapped.filter((item): item is Row => item != null);
}

function isImageSource(value: string): boolean {
  return /^(?:https?:\/\/|data:image\/|\/|[^\s]+\.(?:svg|png|jpe?g|webp)(?:[?#].*)?$)/iu.test(value.trim());
}

export default function IconListSection({ eyebrow, title, items, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const rows = normalize(items);
  const demo: Row[] = [
    { title: "Free shipping", text: "On orders above your store threshold." },
    { title: "Secure checkout", text: "Cards, UPI, and wallets." },
    { title: "Easy returns", text: "Hassle-free policy." },
  ];
  const list = rows.length ? rows : demo;

  return (
    <section className="border-y border-slate-200 bg-white/70 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        {eyebrow?.trim() ? (
          <p className="text-center text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "var(--theme-primary)" }}>
            {t(eyebrow.trim())}
          </p>
        ) : null}
        <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t(title?.trim() || "Why shop with us")}
        </h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((row, index) => (
            <li
              key={`${row.title ?? "item"}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1"
            >
              {row.icon && isImageSource(row.icon) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.icon} alt="" className="h-11 w-11 object-contain" />
              ) : (
                <p
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold"
                  style={{ background: "color-mix(in srgb, var(--theme-primary) 12%, white)", color: "var(--theme-primary)" }}
                  aria-hidden
                >
                  {row.icon || String(index + 1).padStart(2, "0")}
                </p>
              )}
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{t(row.title ?? "")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(row.text ?? "")}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
