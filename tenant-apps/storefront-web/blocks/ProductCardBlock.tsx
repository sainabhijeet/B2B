import { translateText } from "@/engine/template-language";

type Props = {
  product_slug?: string;
  show_price?: boolean | string;
  title_override?: string;
  languageCode?: string;
};

export default function ProductCardBlock({ product_slug, show_price, title_override, languageCode }: Props) {
  const slug = (product_slug || "").trim();
  const title = translateText((title_override || slug || "Featured product").trim(), languageCode);
  const show =
    show_price === true ||
    show_price === "true" ||
    (typeof show_price === "string" && show_price.toLowerCase() === "true");
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <p className="font-semibold text-slate-900">{title}</p>
      {slug ? <p className="mt-1 font-mono text-xs text-slate-500">{slug}</p> : null}
      {show ? <p className="mt-2 text-xs text-slate-600">{translateText("Price on request (B2B)", languageCode)}</p> : null}
    </div>
  );
}
