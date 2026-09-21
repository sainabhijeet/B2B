import { translate } from "@/lib/translation-engine";

type Props = {
  title: string;
  lineTotal: number;
  quantity: number;
  languageCode?: string;
};

export default function CartItem({ title, lineTotal, quantity, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode ?? "en");
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-4">
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{t("Qty")} {quantity}</p>
      </div>
      <p className="font-semibold text-slate-800">{t("INR")} {lineTotal.toLocaleString(languageCode || "en-IN")}</p>
    </div>
  );
}
