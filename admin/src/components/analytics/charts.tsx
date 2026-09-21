type Point = { label: string; value: number };

export function MiniBarChart({
  series,
  formatValue,
  colorClass = 'bg-indigo-500',
}: {
  series: Point[];
  formatValue?: (n: number) => string;
  colorClass?: string;
}) {
  const max = Math.max(...series.map((s) => s.value), 1);
  const fmt = formatValue ?? ((n: number) => n.toLocaleString());
  return (
    <div className="flex h-36 items-end gap-1 border-b border-slate-200 px-1 pb-1 pt-2">
      {series.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className={`w-full max-w-[2.25rem] rounded-t-sm ${colorClass}`}
            style={{
              height: `${Math.max(8, (s.value / max) * 100)}%`,
              minHeight: 4,
            }}
            title={`${s.label}: ${fmt(s.value)}`}
          />
          <span className="max-w-full truncate text-center text-[9px] font-medium text-slate-500">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SparkLine({ series, stroke = 'stroke-indigo-600' }: { series: Point[]; stroke?: string }) {
  if (series.length === 0) return null;
  const max = Math.max(...series.map((s) => s.value), 1);
  const min = Math.min(...series.map((s) => s.value), 0);
  const range = max - min || 1;
  const w = 280;
  const h = 72;
  const pad = 4;
  const xDenom = Math.max(series.length - 1, 1);
  const points = series.map((s, i) => {
    const x = pad + (i / xDenom) * (w - pad * 2);
    const y = h - pad - ((s.value - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="max-w-full" aria-hidden>
      <polyline
        fill="none"
        className={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
}

export function PlanPieLegend({
  segments,
}: {
  segments: { label: string; percent: number; color: string; fill: string }[];
}) {
  let acc = 0;
  const stops = segments.map((s) => {
    const start = acc;
    acc += s.percent;
    return `${s.fill} ${start}% ${acc}%`;
  });
  return (
    <div className="flex flex-col gap-2">
      {segments.map((s) => (
        <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${s.color}`} />
            <span className="truncate text-slate-700">{s.label}</span>
          </div>
          <span className="shrink-0 tabular-nums font-semibold text-slate-900">{s.percent}%</span>
        </div>
      ))}
      <div
        className="mt-1 h-3 w-full overflow-hidden rounded-full"
        style={{
          background: `conic-gradient(${stops.join(', ')})`,
        }}
        title="Plan distribution"
      />
    </div>
  );
}
