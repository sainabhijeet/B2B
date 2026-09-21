import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
};

const tiles = ["Orders", "Addresses", "Wishlist", "Profile"];

export default function AccountDashboardSection({ title, languageCode }: Props & { languageCode?: string }) {
  const tr = (text: string) => translate(text, languageCode);
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{title?.trim() || tr("My account")}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="font-medium text-slate-900">{tr(tile)}</p>
            <p className="mt-2 text-xs text-slate-500">{tr("Shell — link to real account routes.")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
