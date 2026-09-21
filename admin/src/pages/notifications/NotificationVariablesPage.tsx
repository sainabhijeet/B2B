import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useNotificationTemplates } from '@/components/notifications/NotificationTemplatesContext';
import type { TemplateVariableDef } from '@/lib/notificationTemplateModels';

export function NotificationVariablesPage() {
  const { variableDefs } = useNotificationTemplates();

  return (
    <ResourcePanel title="Template variables">
      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Runtime replaces tokens like <span className="font-mono">{'{{customer_name}}'}</span> with namespaced payload
        fields. Use only trusted template sources.
      </p>
      <DataTable
        columns={[
          {
            id: 'tok',
            header: 'Variable',
            cell: (r: TemplateVariableDef) => <span className="font-mono text-xs">{r.token}</span>,
          },
          { id: 'desc', header: 'Description', cell: (r: TemplateVariableDef) => r.description },
          {
            id: 'ex',
            header: 'Example',
            cell: (r: TemplateVariableDef) => <span className="text-slate-700">{r.example}</span>,
          },
        ]}
        rows={variableDefs}
        rowKey={(r: TemplateVariableDef) => r.token}
      />
      <div className="border-t border-slate-100 px-3 py-3 text-[11px] leading-relaxed text-slate-700">
        <p className="font-medium text-slate-800">Sample message</p>
        <p className="mt-1 font-mono text-xs">
          Hello {'{{customer_name}}'}, your order {'{{order_id}}'} is confirmed.
        </p>
      </div>
    </ResourcePanel>
  );
}
