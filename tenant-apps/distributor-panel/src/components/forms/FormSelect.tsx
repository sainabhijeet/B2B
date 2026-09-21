import type { SelectHTMLAttributes } from "react";

export type FormSelectOption = { value: string; label: string; disabled?: boolean };

type FormSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: string;
  options: FormSelectOption[];
  hint?: string;
  error?: string;
};

export function FormSelect({ id, label, options, hint, error, className, ...rest }: FormSelectProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        className={[
          "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors",
          "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "",
          className ?? "",
        ].join(" ")}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && !error ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
