import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { RecordView } from '@/components/ui/RecordView';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';

export function SupportDetailPage() {
  const { ticketId } = useParams();

  return (
    <div>
      <PageHeader
        title={`Ticket · ${ticketId ?? '—'}`}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/support" className={adminBtnSecondary}>
              ← List
            </Link>
            <button type="button" className={adminBtnPrimary}>
              Close ticket
            </button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ResourcePanel title="Thread">
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              Replies / composer — wire to support API.
            </div>
          </ResourcePanel>
        </div>
        <div className="lg:col-span-2">
          <RecordView
            sections={[
              {
                fields: [
                  { label: 'Tenant', value: 'Acme Distributors' },
                  { label: 'Subject', value: 'Payout delay' },
                  { label: 'Status', value: 'open' },
                  { label: 'Assigned', value: '—' },
                  { label: 'Created', value: '2026-04-09 10:22' },
                ],
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
