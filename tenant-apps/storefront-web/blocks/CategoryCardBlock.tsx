import { translateText } from "@/engine/template-language";

type Props = {
  category_slug?: string;
  title_override?: string;
  image?: string;
  languageCode?: string;
};

export default function CategoryCardBlock({ category_slug, title_override, image, languageCode }: Props) {
  const slug = (category_slug || "").trim();
  const title = translateText((title_override || slug || "Category").trim(), languageCode);
  const src = typeof image === "string" ? image.trim() : "";
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {src ? (
        <img src={src} alt="" className="h-28 w-full object-cover" />
      ) : (
        <div className="h-28 w-full bg-slate-100" />
      )}
      <div className="p-3 text-sm">
        <p className="font-semibold text-slate-900">{title}</p>
        {slug ? <p className="mt-0.5 font-mono text-xs text-slate-500">{slug}</p> : null}
      </div>
    </div>
  );
}
