import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIndustries } from '@/components/industries/IndustriesContext';
import { statusLabel, type IndustryRow } from '@/lib/industriesDemoData';
import { IndustryIcon } from '@/pages/industries/industryIcons';

function fmtCreated(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function IndustryListPage() {
  const { industries, industriesLoading, industriesError, reloadIndustries, deleteIndustry, toggleIndustryStatus } =
    useIndustries();
  const sorted = [...industries].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <ResourcePanel
      title="Industry catalog"
      toolbar={
        <Link to="/industries/new" className={adminBtnPrimary}>
          Add industry
        </Link>
      }
    >
      {industriesError ? (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {industriesError}{' '}
          <button type="button" className="font-medium text-indigo-700 underline" onClick={() => void reloadIndustries()}>
            Retry
          </button>
        </p>
      ) : null}
      {industriesLoading ? (
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">Loading…</p>
      ) : null}
      <DataTable
        columns={[
          {
            id: 'ord',
            header: 'Order',
            cell: (r: IndustryRow) => (
              <span className="font-mono text-[10px] text-slate-600">{r.displayOrder}</span>
            ),
          },
          {
            id: 'id',
            header: 'ID',
            cell: (r: IndustryRow) => (
              <span className="font-mono text-[10px] text-slate-500" title={r.industryId}>
                {r.industryId.slice(0, 8)}…
              </span>
            ),
          },
          {
            id: 'ico',
            header: '',
            className: 'w-10',
            cell: (r: IndustryRow) => <IndustryIcon name={r.icon} className="h-4 w-4 shrink-0 text-slate-600" />,
          },
          { id: 'name', header: 'Industry name', cell: (r: IndustryRow) => <span className="font-medium">{r.name}</span> },
          {
            id: 'desc',
            header: 'Description',
            cell: (r: IndustryRow) => <span className="line-clamp-2 max-w-xs text-xs text-slate-600">{r.description}</span>,
          },
          {
            id: 'st',
            header: 'Status',
            cell: (r: IndustryRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {statusLabel(r.status)}
              </span>
            ),
          },
          { id: 'ca', header: 'Created', cell: (r: IndustryRow) => fmtCreated(r.createdAt) },
          {
            id: 'act',
            header: 'Actions',
            className: 'min-w-[12rem]',
            cell: (r: IndustryRow) => (
              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                <Link to={`/industries/${r.industryId}/edit`} className={adminBtnSecondary}>
                  Edit
                </Link>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  onClick={() => void toggleIndustryStatus(r.industryId)}
                >
                  {r.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className={adminBtnDanger}
                  onClick={() => {
                    if (window.confirm(`Delete industry “${r.name}”?`)) void deleteIndustry(r.industryId);
                  }}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        rows={sorted}
        rowKey={(r) => r.industryId}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Maps to <span className="font-mono">industries</span>. Inactive = hidden from new distributor signup.
      </p>
    </ResourcePanel>
  );
}
