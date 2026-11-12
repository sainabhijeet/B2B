import { translate } from "@/lib/translation-engine";

type Props = {
  languageCode: string;
  notice?: string | null;
};

const DEFAULT_NOTICE =
  "Demo catalog preview: Products, prices, stock and offers shown here are sample data for testing only. They are not available for purchase. Real products will appear after the distributor adds the first product.";

export const THEME_LIVE_PREVIEW_NOTICE =
  "Theme Live Preview: This preview intentionally shows the selected theme's sample catalog, even when real products exist. Uploaded products are unchanged and continue to appear on the public storefront.";

export default function DemoCatalogNotice({ languageCode, notice }: Props) {
  const message = notice?.trim() || DEFAULT_NOTICE;
  return (
    <aside
      role="note"
      aria-label={translate("Demo catalog notice", languageCode)}
      className="sticky top-0 z-[70] border-y border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-950 shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-center gap-2 text-center text-xs font-medium leading-5 sm:text-sm">
        <span aria-hidden="true">{String.fromCodePoint(9432)}</span>
        <span>{translate(message, languageCode)}</span>
      </div>
    </aside>
  );
}
