import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";

type Props = {
  themeKey?: ThemeKey;
  title?: string;
};

const demoFilters = ["Category", "Price", "Brand", "Size", "Color"];

export default function FilterSidebarSection({ title, languageCode }: Props & { languageCode?: string }) {
  const t = (text: string) => translate(text, languageCode);
  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title?.trim() || t("Filters")}</p>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        {demoFilters.map((f) => (
          <li key={f}>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="rounded border-slate-300" readOnly />
              {t(f)}
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-slate-400">{t("Static shell — connect to search / category APIs.")}</p>
    </aside>
  );
}
