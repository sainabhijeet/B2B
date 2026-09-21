import { Link } from 'react-router-dom';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { WhatsappOverviewRow } from '../api/whatsappApi';

type Props = {
  row: WhatsappOverviewRow;
  syncing: boolean;
  onSync: (tenantId: string) => void;
};

export function TenantWhatsAppCard({ row, syncing, onSync }: Props) {
  const status = row.wa_active ? 'Active' : 'Inactive';
  const err = row.last_meta_sync_error?.trim();

  return (
    <tr className="border-b border-slate-100 align-top text-xs text-slate-800">
      <td className="py-2 pr-2">
        <div className="font-medium text-slate-900">{row.tenant_name}</div>
        <div className="text-[10px] text-slate-500">{row.tenant_slug}</div>
      </td>
      <td className="py-2 pr-2">
        <span
          className={
            row.wa_active
              ? 'rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800'
              : 'rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600'
          }
        >
          {status}
        </span>
        {row.wa_active && !row.graph_api_token_configured ? (
          <div className="mt-1 max-w-[14rem] text-[10px] text-red-800" title="No Graph token">
            No Meta token: set WHATSAPP_SHARED_TOKEN / WHATSAPP_CLOUD_ACCESS_TOKEN on the API, or enable &quot;Use own
            token&quot; with an access token.
          </div>
        ) : null}
        {err ? (
          <div className="mt-1 max-w-[14rem] truncate text-[10px] text-amber-800" title={err}>
            Sync: {err}
          </div>
        ) : null}
      </td>
      <td className="py-2 pr-2 tabular-nums text-slate-700">{row.templates_count}</td>
      <td className="py-2">
        <div className="flex flex-wrap gap-1">
          <Link to={`/whatsapp/${row.tenant_id}`} className={adminBtnSecondary}>
            Configure
          </Link>
          <button
            type="button"
            className={adminBtnPrimary}
            disabled={syncing || !row.wa_active}
            title={!row.wa_active ? 'Enable WhatsApp for this tenant first' : undefined}
            onClick={() => onSync(row.tenant_id)}
          >
            {syncing ? '…' : 'Sync'}
          </button>
          <Link to={`/whatsapp/${row.tenant_id}/templates`} className={adminBtnSecondary}>
            View
          </Link>
        </div>
      </td>
    </tr>
  );
}
