import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  variant?: string;
  title?: string;
  subtitle?: string;
  emailPlaceholder?: string;
  buttonText?: string;
} & Record<string, unknown>;

export default function Newsletter({ title, subtitle, emailPlaceholder, buttonText, languageCode }: Props & { languageCode?: string }) {
  const t = (text: string) => translate(text, languageCode);
  return (
    <section className="bg-[#111111] py-14 text-white">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h3 className="text-3xl font-semibold">{t(title?.trim() || "Join our newsletter")}</h3>
        <p className="mt-2 text-sm text-white/75">{t(subtitle?.trim() || "Get the latest updates from our store.")}</p>
        <form action="#" method="post" className="mx-auto mt-6 flex max-w-md items-center gap-2">
          <input
            type="email"
            placeholder={t(emailPlaceholder?.trim() || "Enter your email")}
            className="h-11 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-sm placeholder:text-white/60"
          />
          <button type="submit" className="h-11 rounded-md bg-white px-4 text-sm font-medium text-black">
            {t(buttonText?.trim() || "Subscribe")}
          </button>
        </form>
      </div>
    </section>
  );
}
