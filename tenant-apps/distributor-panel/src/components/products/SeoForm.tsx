import { FormInput } from "@/components/forms/FormInput";

type Props = {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  onChange: (patch: { metaTitle?: string; metaDescription?: string; metaKeywords?: string }) => void;
  disabled?: boolean;
};

export function SeoForm({ metaTitle, metaDescription, metaKeywords, onChange, disabled }: Props) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="px-1 text-sm font-semibold text-slate-800">SEO</legend>
      <FormInput
        id="seo-title"
        label="Meta title"
        value={metaTitle}
        disabled={disabled}
        onChange={(e) => onChange({ metaTitle: e.target.value })}
      />
      <div>
        <label htmlFor="seo-desc" className="block text-xs font-medium text-slate-700">
          Meta description
        </label>
        <textarea
          id="seo-desc"
          rows={3}
          value={metaDescription}
          disabled={disabled}
          onChange={(e) => onChange({ metaDescription: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        />
      </div>
      <FormInput
        id="seo-keywords"
        label="Meta keywords"
        hint="Comma-separated."
        value={metaKeywords}
        disabled={disabled}
        onChange={(e) => onChange({ metaKeywords: e.target.value })}
      />
    </fieldset>
  );
}
