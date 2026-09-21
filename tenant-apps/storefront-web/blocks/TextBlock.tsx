import { translateText } from "@/engine/template-language";

type Props = {
  text?: string;
  /** Editor schema uses `body` for textarea content. */
  body?: string;
  align?: string;
  languageCode?: string;
};

export default function TextBlock({ text, body, align, languageCode }: Props) {
  const bodyText = (typeof body === "string" ? body : text)?.trim() || "";
  const a = (align || "left").toLowerCase();
  const cls = a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";
  return (
    <p className={`max-w-2xl text-sm leading-relaxed text-slate-600 ${cls}`}>
      {bodyText ? translateText(bodyText, languageCode) : translateText("Body copy from theme JSON.", languageCode)}
    </p>
  );
}
