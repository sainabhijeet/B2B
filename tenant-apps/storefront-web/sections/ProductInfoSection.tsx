import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
  price?: string;
  description?: string;
  languageCode?: string;
};

export default function ProductInfoSection({ title, price, description, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title?.trim() || t("Product")}</h1>
      {price?.trim() ? <p className="mt-3 text-xl font-medium text-slate-800">{price.trim()}</p> : null}
      {description?.trim() ? <p className="mt-4 text-sm leading-relaxed text-slate-600">{description.trim()}</p> : null}
    </section>
  );
}
