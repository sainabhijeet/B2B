import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  image?: string;
  imagePosition?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  ourStoryTitle?: string;
  ourStoryText?: string;
  imageLeft?: string;
  imageCenter?: string;
  imageRight?: string;
  languageCode?: string;
};

export default function HeroSplit({
  image,
  imagePosition,
  title,
  subtitle,
  description,
  ourStoryTitle,
  ourStoryText,
  imageLeft,
  imageCenter,
  imageRight,
  languageCode,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const fallbackImage = image ?? "";
  const position = imagePosition?.toLowerCase();
  const leftImage = imageLeft ?? (position === "left" ? fallbackImage : undefined);
  const centerImage = imageCenter ?? (position !== "left" && position !== "right" ? fallbackImage : undefined);
  const rightImage = imageRight ?? (position === "right" ? fallbackImage : undefined);
  const resolvedSubtitle = subtitle ?? description;
  return (
    <section className="py-16" style={{ background: "var(--theme-surface)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-3 lg:items-start">
        <div>
          <div className="overflow-hidden rounded-xl bg-white/70 shadow-sm">
            {leftImage ? <img src={leftImage} alt="" className="h-72 w-full object-cover" /> : <div className="h-72 bg-slate-100" />}
          </div>
          <h2 className="mt-6 text-4xl font-semibold" style={{ color: "var(--theme-text)" }}>{t(title?.trim() || "Featured collection")}</h2>
          <p className="mt-3 text-sm" style={{ color: "var(--theme-muted)" }}>{t(resolvedSubtitle?.trim() || "Discover our latest collection.")}</p>
        </div>
        <div className="overflow-hidden rounded-xl bg-white/70 shadow-sm">
          {centerImage ? (
            <img src={centerImage} alt="" className="h-[28rem] w-full object-cover" />
          ) : (
            <div className="h-[28rem] bg-slate-100" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold" style={{ color: "var(--theme-text)" }}>{t(ourStoryTitle?.trim() || "Our story")}</h3>
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--theme-muted)" }}>
            {t(ourStoryText?.trim() || "Built with care for every customer.")}
          </p>
          <div className="mt-6 overflow-hidden rounded-xl bg-white/70 shadow-sm">
            {rightImage ? (
              <img src={rightImage} alt="" className="h-72 w-full object-cover" />
            ) : (
              <div className="h-72 bg-slate-100" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
