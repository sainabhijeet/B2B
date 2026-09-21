import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";
import Link from "next/link";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
};

export default function CheckoutSummarySection({ title, languageCode }: Props & { languageCode?: string }) {
  const t = (text: string) => translate(text, languageCode);
  return (
    <section className="mx-auto max-w-lg px-4 py-8">
      <h2 className="text-lg font-semibold text-slate-900">{title?.trim() || t("Checkout")}</h2>
      <Link href="/checkout" className="mt-5 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        {t("Checkout")}
      </Link>
    </section>
  );
}
