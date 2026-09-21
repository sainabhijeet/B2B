import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  body?: string;
  image?: string;
  imagePosition?: string;
  languageCode?: string;
};

export default function ImageWithTextSection({ title, body, image, imagePosition, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const pos = (imagePosition || "right").toLowerCase();
  const imageFirst = pos === "left";
  const img = (
    <div className="min-h-[200px]">
      {image ? (
        <img src={image} alt="" className="h-full w-full max-h-80 rounded-2xl object-cover shadow-sm" />
      ) : (
        <div className="h-72 rounded-2xl" style={{ background: "color-mix(in srgb, var(--theme-secondary) 22%, white)" }} />
      )}
    </div>
  );
  const copy = (
    <div>
      <h2 className="text-2xl font-semibold" style={{ color: "var(--theme-text)" }}>
        {t(title?.trim() || "Discover more")}
      </h2>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--theme-muted)" }}>
        {t(body?.trim() || "Pair photography with short editorial copy.")}
      </p>
    </div>
  );
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className={imageFirst ? "order-1" : "order-1 md:order-2"}>{img}</div>
        <div className={imageFirst ? "order-2" : "order-2 md:order-1"}>{copy}</div>
      </div>
    </section>
  );
}
