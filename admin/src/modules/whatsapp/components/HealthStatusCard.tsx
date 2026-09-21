type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
};

export function HealthStatusCard({ title, value, subtitle }: Props) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
      {subtitle ? <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div> : null}
    </div>
  );
}
