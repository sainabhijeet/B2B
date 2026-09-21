import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  variant?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  languageCode?: string;
} & Record<string, unknown>;

export default function EditorialBanner({ title, subtitle, image, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  return (
    <section className="py-14" style={{ background: "var(--theme-surface)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:items-center">
        <div>
          <h3 className="text-3xl font-semibold" style={{ color: "var(--theme-text)" }}>{t(title?.trim() || "Editorial picks")}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t(subtitle || "Explore editorial picks and signature designs curated by our stylists.")}
          </p>
        </div>
        {image ? (
          <img src={image} alt="" className="h-64 w-full rounded-xl object-cover" />
        ) : (
          <div className="h-64 rounded-xl bg-slate-200" />
        )}
      </div>
    </section>
  );
}
