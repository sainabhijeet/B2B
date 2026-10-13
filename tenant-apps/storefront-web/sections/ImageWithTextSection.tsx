import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  body?: string;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  highlights?: unknown;
  languageCode?: string;
};

function normalizeHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function ImageWithTextSection({
  eyebrow,
  title,
  body,
  image,
  imageAlt,
  imagePosition,
  highlights,
  languageCode,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const pos = (imagePosition || "right").toLowerCase();
  const imageFirst = pos === "left";
  const heading = title?.trim() || "Discover more";
  const paragraphs = (body?.trim() || "Pair photography with short editorial copy.")
    .split(/\n\n+/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const points = normalizeHighlights(highlights);
  const img = (
    <div className="min-h-[240px]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={t(imageAlt?.trim() || heading)} className="h-full min-h-[300px] w-full rounded-3xl border border-slate-200 object-cover shadow-sm md:min-h-[380px]" />
      ) : (
        <div className="h-80 rounded-3xl" style={{ background: "color-mix(in srgb, var(--theme-secondary) 22%, white)" }} />
      )}
    </div>
  );
  const copy = (
    <div>
      {eyebrow?.trim() ? (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: "var(--theme-primary)" }}>
          {t(eyebrow.trim())}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--theme-text)" }}>
        {t(heading)}
      </h1>
      <div className="mt-5 space-y-4 text-base leading-7" style={{ color: "var(--theme-muted)" }}>
        {paragraphs.map((paragraph, index) => <p key={index}>{t(paragraph)}</p>)}
      </div>
      {points.length ? (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-3 text-sm font-medium" style={{ color: "var(--theme-text)" }}>
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "color-mix(in srgb, var(--theme-primary) 14%, white)", color: "var(--theme-primary)" }}
              >
                {"\u2713"}
              </span>
              {t(point)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
        <div className={imageFirst ? "order-1" : "order-1 md:order-2"}>{img}</div>
        <div className={imageFirst ? "order-2" : "order-2 md:order-1"}>{copy}</div>
      </div>
    </section>
  );
}
