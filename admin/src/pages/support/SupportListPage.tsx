import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';

type Row = {
  id: string;
  tenant: string;
  subject: string;
  status: string;
  assignee: string;
  created: string;
};

const ROWS: Row[] = [
  {
    id: 'TCK-001',
    tenant: 'Acme',
    subject: 'Payout delay',
    status: 'open',
    assignee: '—',
    created: '2026-04-09',
  },
  {
    id: 'TCK-002',
    tenant: 'Northwind',
    subject: 'Theme build failed',
    status: 'in_progress',
    assignee: 'Support A',
    created: '2026-04-08',
  },
];

export function SupportListPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Support tickets"
        description="Platform support queue."
      />
      <ResourcePanel>
        <DataTable
          columns={[
            { id: 'id', header: 'ID', cell: (r) => r.id },
            { id: 'tenant', header: 'Tenant', cell: (r) => r.tenant },
            { id: 'subject', header: 'Subject', cell: (r) => r.subject },
            {
              id: 'status',
              header: 'Status',
              cell: (r) => (
                <span className="text-xs capitalize text-slate-700">{r.status.replace('_', ' ')}</span>
              ),
            },
            { id: 'assignee', header: 'Assigned', cell: (r) => r.assignee },
            { id: 'created', header: 'Created', cell: (r) => r.created },
          ]}
          rows={ROWS}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/support/${r.id}`)}
        />
      </ResourcePanel>
    </div>
  );
}
