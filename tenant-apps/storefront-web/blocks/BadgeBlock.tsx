import { translateText } from "@/engine/template-language";

type Props = {
  text?: string;
  tone?: string;
  languageCode?: string;
};

export default function BadgeBlock({ text, tone, languageCode }: Props) {
  const t = translateText((text || "Badge").trim(), languageCode);
  const toneKey = (tone || "neutral").toLowerCase();
  const cls =
    toneKey === "sale" || toneKey === "warning"
      ? "bg-amber-100 text-amber-900"
      : toneKey === "success"
        ? "bg-emerald-100 text-emerald-900"
        : "bg-slate-100 text-slate-800";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{t}</span>
  );
}
