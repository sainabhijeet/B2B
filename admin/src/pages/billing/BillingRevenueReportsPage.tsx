import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import {
  SAAS_REVENUE_BY_PLAN,
  SAAS_REVENUE_SUMMARY,
  SAAS_REVENUE_TREND,
  formatInr,
} from '@/lib/billingDemoData';

export function BillingRevenueReportsPage() {
  const maxBar = Math.max(...SAAS_REVENUE_TREND.map((d) => d.subscription), 1);
  const s = SAAS_REVENUE_SUMMARY;

  return (
    <div className="space-y-4">
      <ResourcePanel title="SaaS revenue (subscription only)">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">MRR</div>
            <div className="text-lg font-semibold tabular-nums">{formatInr(s.mrr)}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">ARR (indicative)</div>
            <div className="text-lg font-semibold tabular-nums">{formatInr(s.arr)}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Collected (MTD)</div>
            <div className="text-lg font-semibold tabular-nums">{formatInr(s.collectedThisMonth)}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Outstanding</div>
            <div className="text-lg font-semibold tabular-nums text-amber-900">{formatInr(s.outstanding)}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Refund exposure</div>
            <div className="text-lg font-semibold tabular-nums text-slate-700">{formatInr(s.refundExposure)}</div>
          </div>
        </div>
        <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
          Excludes distributor B2C product GMV — that is reported in the distributor commerce stack.
        </p>
      </ResourcePanel>

      <ResourcePanel title="MRR by plan">
        <DataTable
          columns={[
            { id: 'p', header: 'Plan', cell: (r) => r.plan },
            { id: 'm', header: 'MRR', cell: (r) => formatInr(r.mrr) },
            { id: 'n', header: 'Subscribers', cell: (r) => r.subscribers.toLocaleString() },
          ]}
          rows={SAAS_REVENUE_BY_PLAN}
          rowKey={(r) => r.plan}
        />
      </ResourcePanel>

      <ResourcePanel title="Subscription revenue trend">
        <div className="space-y-3 p-3">
          {SAAS_REVENUE_TREND.map((d) => (
            <div key={d.month} className="flex items-center gap-3 text-xs">
              <span className="w-10 shrink-0 text-slate-600">{d.month}</span>
              <div className="h-6 flex-1 rounded-sm bg-slate-100">
                <div
                  className="flex h-6 min-w-[2rem] items-center justify-end rounded-sm bg-indigo-500 pr-2 text-[10px] font-medium text-white"
                  style={{ width: `${(d.subscription / maxBar) * 100}%` }}
                >
                  {formatInr(d.subscription)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ResourcePanel>
    </div>
  );
}
