import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";

type Props = {
  themeKey?: ThemeKey;
  columns?: Array<{
    heading?: string;
    title?: string;
    links?: Array<string | { label?: string; title?: string; text?: string; url?: string; href?: string }>;
  }>;
  languageCode?: string;
};

export default function FooterColumns({ columns, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const blocks = (columns ?? []).map((block) => ({
    heading: block.heading ?? block.title ?? "",
    links: (block.links ?? []).map((link) =>
      typeof link === "string" ? link : link.label ?? link.title ?? link.text ?? "",
    ),
  }));
  return (
    <footer className="border-t py-12" style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
        {blocks.map((block) => (
          <div key={block.heading}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--theme-text)" }}>
              {t(block.heading ?? "")}
            </h3>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--theme-muted)" }}>
              {(block.links ?? []).map((label) => (
                <li key={label}>{t(label)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
