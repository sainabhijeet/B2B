import type { MetaTemplateRow } from '../api/whatsappApi';

type Props = {
  rows: MetaTemplateRow[];
};

export function TemplatesTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="text-xs text-slate-500">No templates synced yet. Run sync from Meta.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white">
      <table className="min-w-full text-left text-xs text-slate-800">
        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-2 py-2">Template name</th>
            <th className="px-2 py-2">Category</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2">Language</th>
            <th className="px-2 py-2">Last synced</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.template_name}-${r.language}`} className="border-b border-slate-100">
              <td className="px-2 py-1.5 font-mono text-[11px]">{r.template_name}</td>
              <td className="px-2 py-1.5">{r.category ?? '—'}</td>
              <td className="px-2 py-1.5">{r.status}</td>
              <td className="px-2 py-1.5">{r.language}</td>
              <td className="px-2 py-1.5 text-slate-600">
                {r.last_synced_at ? new Date(r.last_synced_at).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
