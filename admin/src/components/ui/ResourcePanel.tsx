import type { ReactNode } from 'react';

type ResourcePanelProps = {
  title?: string;
  toolbar?: ReactNode;
  children: ReactNode;
};

/** Admin-style bordered content region (list filter row + table, etc.) */
export function ResourcePanel({ title, toolbar, children }: ResourcePanelProps) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
      {title != null || toolbar != null ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          {title ? (
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          ) : (
            <span />
          )}
          {toolbar}
        </div>
      ) : null}
      {children}
    </div>
  );
}
