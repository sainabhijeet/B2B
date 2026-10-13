"use client";

type SortValue = "newest" | "best_selling" | "price_asc" | "price_desc";

type Props = {
  action: string;
  value: SortValue;
  preservedParams: [string, string][];
  label: string;
  options: { value: SortValue; label: string }[];
};

export default function CatalogSortControl({ action, value, preservedParams, label, options }: Props) {
  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {preservedParams.map(([key, itemValue], index) => (
        <input key={`${key}-${index}`} type="hidden" name={key} value={itemValue} />
      ))}
      <label htmlFor="category-sort" className="text-xs font-semibold text-slate-600">{label}</label>
      <select
        id="category-sort"
        name="sort"
        value={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <noscript>
        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Apply</button>
      </noscript>
    </form>
  );
}
