import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useIndustries } from '@/components/industries/IndustriesContext';
import type { IndustryMappingRow } from '@/lib/industriesDemoData';

export function IndustryMappingPage() {
  const { mappings } = useIndustries();
  const sorted = [...mappings].sort((a, b) => a.industryName.localeCompare(b.industryName));

  return (
    <div className="space-y-4">
      <ResourcePanel title="Industry → catalog mapping">
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Industry list comes from the <span className="font-mono">industries</span> table. Category / attribute /
          theme suggestions will use <span className="font-mono">industry_categories</span>,{' '}
          <span className="font-mono">industry_attributes</span>, <span className="font-mono">industry_themes</span> when
          wired.
        </p>
        <DataTable
          columns={[
            {
              id: 'ind',
              header: 'Industry',
              cell: (r: IndustryMappingRow) => <span className="font-medium text-slate-900">{r.industryName}</span>,
            },
            {
              id: 'cat',
              header: 'Categories',
              cell: (r: IndustryMappingRow) => (
                <span className="text-xs text-slate-700">{r.categoryNames.length ? r.categoryNames.join(', ') : '—'}</span>
              ),
            },
            {
              id: 'attr',
              header: 'Attributes',
              cell: (r: IndustryMappingRow) => (
                <span className="text-xs text-slate-700">{r.attributeNames.length ? r.attributeNames.join(', ') : '—'}</span>
              ),
            },
            {
              id: 'th',
              header: 'Themes',
              cell: (r: IndustryMappingRow) => (
                <span className="text-xs text-slate-700">{r.themeNames.length ? r.themeNames.join(', ') : '—'}</span>
              ),
            },
          ]}
          rows={sorted}
          rowKey={(r) => r.industryId}
        />
      </ResourcePanel>

      <ResourcePanel title="Example: distributor flow">
        <div className="space-y-2 px-3 py-3 text-xs text-slate-700">
          <p>
            <strong>Distributor signup</strong> → Select industry (e.g. Electronics) → system suggests{' '}
            <em>Mobile, Laptop, Accessories</em> categories and related attributes.
          </p>
          <p className="text-[10px] text-slate-500">
            Hierarchy: <span className="font-mono">Industry → Categories → Attributes → Products</span>
          </p>
        </div>
      </ResourcePanel>
    </div>
  );
}
