import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";
import Link from "next/link";

type Post = { title: string; excerpt?: string; href?: string; image?: string; date?: string };
type JournalCategory = { label: string; count?: number };

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  posts?: unknown;
  categories?: unknown;
  languageCode?: string;
  variant?: string;
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
      image: typeof o.image === "string" ? o.image : typeof o.imageUrl === "string" ? o.imageUrl : "",
      date: typeof o.date === "string" ? o.date : "",
    };
  });
  return mapped.filter((x): x is Post => x != null);
}

function normalizeCategories(raw: unknown): JournalCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry === "string" && entry.trim()) return [{ label: entry.trim() }];
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    const label = typeof value.label === "string" ? value.label.trim() : "";
    if (!label) return [];
    return [{ label, count: typeof value.count === "number" ? value.count : undefined }];
  });
}

export default function BlogPreviewSection({ eyebrow, title, subtitle, posts, categories, languageCode, variant }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  const list = normalize(posts);
  const demo: Post[] = [
    { title: t("Styling layered necklaces"), excerpt: t("Three rules for everyday shine."), href: "#" },
    { title: t("Care guide: gold vermeil"), excerpt: t("Keep plating fresh for seasons."), href: "#" },
  ];
  const rows = list.length ? list : demo;
  if (variant === "blog-editorial-index") {
    const journalCategories = normalizeCategories(categories);
    return (
      <section className="aurelia-journal-index">
        <div className="aurelia-journal-shell">
          <div className="aurelia-journal-heading">
            <div>
              <p>{t(eyebrow?.trim() || "FIELD NOTES")}</p>
              <h2>{t(title?.trim() || "The Aurelia Journal")}</h2>
            </div>
            <p>{t(subtitle?.trim() || "Original notes on material, form and the rituals that make jewellery personal.")}</p>
          </div>
          <div className="aurelia-journal-layout">
            <div className="aurelia-journal-posts">
              {rows.map((post, index) => (
                <article key={`${post.title}-${index}`} className="aurelia-journal-post">
                  {post.image ? (
                    <Link href={post.href || "/blog"} className="aurelia-journal-media">
                      <img src={post.image} alt="" />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </Link>
                  ) : null}
                  <div className="aurelia-journal-copy">
                    <div className="aurelia-journal-meta">
                      <span>{t("Aurelia atelier")}</span>
                      {post.date ? <time>{t(post.date)}</time> : null}
                    </div>
                    <h3><Link href={post.href || "/blog"}>{t(post.title)}</Link></h3>
                    <p>{t(post.excerpt || "")}</p>
                    <Link href={post.href || "/blog"} className="aurelia-journal-read">{t("Read the note")} <span aria-hidden="true">↗</span></Link>
                  </div>
                </article>
              ))}
            </div>
            <aside className="aurelia-journal-aside">
              <form action="/search" role="search">
                <label htmlFor="aurelia-journal-search" className="sr-only">{t("Search journal")}</label>
                <input id="aurelia-journal-search" name="q" type="search" placeholder={t("Search the journal")} />
                <button type="submit" aria-label={t("Search")}>⌕</button>
              </form>
              <div className="aurelia-journal-aside-block">
                <p className="aurelia-aside-kicker">{t("IN THIS JOURNAL")}</p>
                <ul>
                  {journalCategories.map((category) => (
                    <li key={category.label}>
                      <a href={`#${category.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{t(category.label)}</a>
                      {typeof category.count === "number" ? <span>{String(category.count).padStart(2, "0")}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="aurelia-journal-aside-block aurelia-journal-note">
                <p className="aurelia-aside-kicker">{t("ATELIER LETTER")}</p>
                <h3>{t("A slower way to choose what lasts.")}</h3>
                <p>{t("Receive one considered story each month—materials, makers and care rituals, without the noise.")}</p>
                <a href="#footer">{t("Join the list")} <span aria-hidden="true">→</span></a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    );
  }
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
            <Link href={p.href || "/blog"} className="group flex h-full min-h-52 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--theme-secondary)]/50 hover:bg-white/[0.1]">
              {p.image ? <span className="theme-blog-image-wrap"><img src={p.image} alt="" className="theme-blog-image" /></span> : null}
              {p.date ? <time className="theme-blog-date">{t(p.date)}</time> : null}
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
