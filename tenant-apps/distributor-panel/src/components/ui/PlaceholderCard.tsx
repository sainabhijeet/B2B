import type { ReactNode } from "react";

type PlaceholderCardProps = {
  title: string;
  children?: ReactNode;
};

export function PlaceholderCard({ title, children }: PlaceholderCardProps) {
  return (
    <section className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
      <div className="mt-2 text-xs text-slate-600">
        {children ?? <p className="italic text-slate-400">No content.</p>}
      </div>
    </section>
  );
}
