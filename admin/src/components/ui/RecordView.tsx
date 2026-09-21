import type { ReactNode } from 'react';

export type RecordField = { label: string; value: ReactNode };

type RecordSection = {
  title?: string;
  fields: RecordField[];
};

type RecordViewProps = {
  sections: RecordSection[];
};

/** Simple read-first detail layout (AdminJS record view feel). */
export function RecordView({ sections }: RecordViewProps) {
  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div
          key={section.title ?? `section-${si}`}
          className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm"
        >
          {section.title ? (
            <div className="border-b border-slate-200 bg-slate-50/90 px-3 py-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {section.title}
              </h3>
            </div>
          ) : null}
          <dl className="grid grid-cols-1 sm:grid-cols-2">
            {section.fields.map((field, i) => (
              <div
                key={`${field.label}-${i}`}
                className="border-b border-slate-100 px-3 py-2 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0"
              >
                <dt className="text-xs font-medium text-slate-500">{field.label}</dt>
                <dd className="mt-0.5 break-words text-sm text-slate-900">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
