import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Post = { title: string; excerpt?: string; href?: string };

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  posts?: unknown;
  languageCode?: string;
};

function normalize(raw: unknown): Post[] {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((x): Post | null => {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!title) return null;
    return {
      title,
      excerpt: typeof o.excerpt === "string" ? o.excerpt : "",
      href: typeof o.href === "string" ? o.href : typeof o.url === "string" ? o.url : "#",
    };
  });
  return mapped.filter((x): x is Post => x != null);
}

export default function BlogPreviewSection({ title, posts, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  const list = normalize(posts);
  const demo: Post[] = [
    { title: t("Styling layered necklaces"), excerpt: t("Three rules for everyday shine."), href: "#" },
    { title: t("Care guide: gold vermeil"), excerpt: t("Keep plating fresh for seasons."), href: "#" },
  ];
  const rows = list.length ? list : demo;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-semibold text-slate-900">{title?.trim() || t("From the journal")}</h2>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {rows.map((p, i) => (
          <li key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <a href={p.href || "#"} className="block">
              <p className="font-medium text-slate-900 hover:text-indigo-700">{p.title}</p>
              <p className="mt-2 text-sm text-slate-600">{p.excerpt}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
