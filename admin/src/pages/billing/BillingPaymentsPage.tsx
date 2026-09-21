import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { INITIAL_SUBSCRIPTION_PAYMENTS, formatInr, type SubscriptionPaymentRow } from '@/lib/billingDemoData';

function fmtAt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function payStatusClass(s: SubscriptionPaymentRow['status']) {
  if (s === 'completed') return 'text-emerald-700';
  if (s === 'pending') return 'text-amber-800';
  return 'text-red-700';
}

export function BillingPaymentsPage() {
  const rows = [...INITIAL_SUBSCRIPTION_PAYMENTS].sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return (
    <ResourcePanel title="Subscription payments">
      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Payments against <strong>SaaS subscription</strong> invoices only. Customer → distributor product payments are
        not listed here.
      </p>
      <DataTable
        columns={[
          {
            id: 'pid',
            header: 'Payment ID',
            cell: (r: SubscriptionPaymentRow) => <span className="font-mono text-[10px]">{r.paymentId}</span>,
          },
          {
            id: 'inv',
            header: 'Invoice',
            cell: (r: SubscriptionPaymentRow) => <span className="font-mono text-[10px] font-medium">{r.invoiceId}</span>,
          },
          { id: 'dist', header: 'Distributor', cell: (r: SubscriptionPaymentRow) => r.distributorName },
          { id: '$', header: 'Amount', cell: (r: SubscriptionPaymentRow) => formatInr(r.amount) },
          { id: 'm', header: 'Method', cell: (r: SubscriptionPaymentRow) => r.method },
          {
            id: 'st',
            header: 'Status',
            cell: (r: SubscriptionPaymentRow) => (
              <span className={`text-xs font-medium capitalize ${payStatusClass(r.status)}`}>{r.status}</span>
            ),
          },
          { id: 'at', header: 'Paid at', cell: (r: SubscriptionPaymentRow) => fmtAt(r.paidAt) },
        ]}
        rows={rows}
        rowKey={(r) => r.paymentId}
      />
    </ResourcePanel>
  );
}
