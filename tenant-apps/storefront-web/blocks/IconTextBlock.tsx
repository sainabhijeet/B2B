import { translateText } from "@/engine/template-language";

type Props = {
  icon?: string;
  title?: string;
  body?: string;
  languageCode?: string;
};

export default function IconTextBlock({ icon, title, body, languageCode }: Props) {
  const ic = typeof icon === "string" ? icon.trim() : "";
  const t = typeof title === "string" ? title.trim() : "";
  const b = typeof body === "string" ? body.trim() : "";
  return (
    <div className="flex gap-3 text-sm text-slate-700">
      {ic ? <span className="text-lg leading-none" aria-hidden>{ic}</span> : null}
      <div className="min-w-0">
        {t ? <p className="font-semibold text-slate-900">{translateText(t, languageCode)}</p> : null}
        {b ? <p className="mt-0.5 text-slate-600">{translateText(b, languageCode)}</p> : null}
      </div>
    </div>
  );
}
