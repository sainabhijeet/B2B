import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import {
  INITIAL_SUBSCRIPTION_INVOICES,
  formatInr,
  invoiceStatusClass,
  type SubscriptionInvoiceRow,
} from '@/lib/billingDemoData';

function fmtAt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SubscriptionInvoicesPage() {
  const rows = [...INITIAL_SUBSCRIPTION_INVOICES].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ResourcePanel title="Subscription invoices">
      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Each row maps to platform <span className="font-mono">invoices</span> for SaaS plans (
        <span className="font-mono">invoice_id</span>, <span className="font-mono">tenant_id</span>,{' '}
        <span className="font-mono">plan_id</span>, <span className="font-mono">amount</span>,{' '}
        <span className="font-mono">tax</span>, <span className="font-mono">status</span>,{' '}
        <span className="font-mono">created_at</span>).
      </p>
      <DataTable
        columns={[
          {
            id: 'inv',
            header: 'Invoice ID',
            cell: (r: SubscriptionInvoiceRow) => <span className="font-mono text-[10px] font-semibold">{r.invoiceId}</span>,
          },
          {
            id: 'dist',
            header: 'Distributor (tenant)',
            cell: (r: SubscriptionInvoiceRow) => (
              <div>
                <div className="text-xs font-medium text-slate-900">{r.distributorName}</div>
                <div className="font-mono text-[10px] text-slate-500">{r.tenantId}</div>
              </div>
            ),
          },
          { id: 'plan', header: 'Plan', cell: (r: SubscriptionInvoiceRow) => r.planName },
          { id: 'amt', header: 'Amount', cell: (r: SubscriptionInvoiceRow) => formatInr(r.amount) },
          { id: 'tax', header: 'Tax', cell: (r: SubscriptionInvoiceRow) => formatInr(r.tax) },
          { id: 'tot', header: 'Total', cell: (r: SubscriptionInvoiceRow) => formatInr(r.total) },
          {
            id: 'st',
            header: 'Status',
            cell: (r: SubscriptionInvoiceRow) => (
              <span className={`text-xs font-medium capitalize ${invoiceStatusClass(r.status)}`}>{r.status}</span>
            ),
          },
          { id: 'per', header: 'Period', cell: (r: SubscriptionInvoiceRow) => r.periodLabel },
          { id: 'ca', header: 'Created at', cell: (r: SubscriptionInvoiceRow) => fmtAt(r.createdAt) },
          {
            id: 'act',
            header: 'Actions',
            cell: (r: SubscriptionInvoiceRow) => (
              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                <button type="button" className={adminBtnSecondary} onClick={() => window.alert(`PDF stub for ${r.invoiceId}`)}>
                  Download
                </button>
                <Link to={`/tenants/${encodeURIComponent(r.tenantId)}`} className={adminBtnSecondary}>
                  Tenant
                </Link>
              </div>
            ),
          },
        ]}
        rows={rows}
        rowKey={(r) => r.invoiceId}
      />
    </ResourcePanel>
  );
}
