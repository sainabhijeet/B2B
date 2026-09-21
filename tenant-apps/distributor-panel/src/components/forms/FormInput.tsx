import type { InputHTMLAttributes } from "react";

type FormInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function FormInput({ id, label, hint, error, className, ...rest }: FormInputProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        className={[
          "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors",
          "focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500",
          error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "",
          className ?? "",
        ].join(" ")}
        {...rest}
      />
      {hint && !error ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
