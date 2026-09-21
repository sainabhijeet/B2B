import { translateText } from "@/engine/template-language";

type Props = {
  text?: string;
  /** Schema stores numeric level "1" | "2" | "3". */
  level?: string;
  languageCode?: string;
};

export default function HeadingBlock({ text, level, languageCode }: Props) {
  const content = translateText(text?.trim() || "Heading", languageCode);
  const lv = (level || "2").trim();
  const L = lv === "1" || lv === "h1" ? "h1" : lv === "3" || lv === "h3" ? "h3" : "h2";
  if (L === "h1") return <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{content}</h1>;
  if (L === "h3") return <h3 className="text-xl font-semibold text-slate-900">{content}</h3>;
  return <h2 className="text-2xl font-semibold text-slate-900">{content}</h2>;
}
