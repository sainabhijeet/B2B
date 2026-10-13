import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";
import Link from "next/link";

type Post = { title: string; excerpt?: string; href?: string };

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
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

export default function BlogPreviewSection({ eyebrow, title, subtitle, posts, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  const list = normalize(posts);
  const demo: Post[] = [
    { title: t("Styling layered necklaces"), excerpt: t("Three rules for everyday shine."), href: "#" },
    { title: t("Care guide: gold vermeil"), excerpt: t("Keep plating fresh for seasons."), href: "#" },
  ];
  const rows = list.length ? list : demo;
  return (
    <section id="retailer-guides" className="bg-slate-950 py-14 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-secondary)]">{t(eyebrow?.trim() || "Ideas for better buying")}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{t(title?.trim() || "From the journal")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{t(subtitle?.trim() || "Practical ideas to help you plan stock, organize your range and serve shoppers better.")}</p>
          </div>
          <Link href="/blog" className="inline-flex w-fit items-center gap-2 text-xs font-extrabold text-[var(--theme-secondary)] hover:text-white">
            {t("Explore all guides")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {rows.map((p, i) => (
          <li key={i}>
            <Link href={p.href || "/blog"} className="group flex h-full min-h-52 flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--theme-secondary)]/50 hover:bg-white/[0.1]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-[var(--theme-secondary)]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-7 text-lg font-bold leading-6 text-white group-hover:text-[var(--theme-secondary)]">{t(p.title)}</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">{t(p.excerpt ?? "")}</p>
              <span className="mt-auto pt-5 text-xs font-bold text-white/80">{t("Read guide")} <span aria-hidden="true">→</span></span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
