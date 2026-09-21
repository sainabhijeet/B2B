import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { INITIAL_SUBSCRIPTION_REFUNDS, formatInr, type SubscriptionRefundRow } from '@/lib/billingDemoData';

function fmtAt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function BillingRefundsPage() {
  const rows = [...INITIAL_SUBSCRIPTION_REFUNDS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ResourcePanel title="Subscription refunds">
      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Refunds against <strong>platform subscription</strong> charges. Product order refunds stay in the distributor
        order workflow (<span className="font-mono">INV-ORD-*</span>).
      </p>
      <DataTable
        columns={[
          {
            id: 'rid',
            header: 'Refund ID',
            cell: (r: SubscriptionRefundRow) => <span className="font-mono text-[10px]">{r.refundId}</span>,
          },
          {
            id: 'inv',
            header: 'Invoice',
            cell: (r: SubscriptionRefundRow) => <span className="font-mono text-[10px] font-medium">{r.invoiceId}</span>,
          },
          { id: 'd', header: 'Distributor', cell: (r: SubscriptionRefundRow) => r.distributorName },
          { id: '$', header: 'Amount', cell: (r: SubscriptionRefundRow) => formatInr(r.amount) },
          { id: 'why', header: 'Reason', cell: (r: SubscriptionRefundRow) => r.reason },
          {
            id: 'st',
            header: 'Status',
            cell: (r: SubscriptionRefundRow) => (
              <span className={r.status === 'completed' ? 'text-emerald-700' : 'text-amber-800'}>{r.status}</span>
            ),
          },
          { id: 'at', header: 'Created at', cell: (r: SubscriptionRefundRow) => fmtAt(r.createdAt) },
        ]}
        rows={rows}
        rowKey={(r) => r.refundId}
      />
    </ResourcePanel>
  );
}
