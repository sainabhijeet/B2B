import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { TemplatesTable } from '../components/TemplatesTable';
import { useWhatsApp } from '../hooks/useWhatsApp';

type Flash = { type: 'ok' | 'err'; message: string } | null;

export function WhatsAppTemplatesPage() {
  const { tenantId } = useParams();
  const { templates, loading, error, actions } = useWhatsApp(tenantId);
  const [syncing, setSyncing] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);

  if (!tenantId) {
    return <p className="text-xs text-slate-600">Missing tenant id.</p>;
  }

  async function onSync() {
    setSyncing(true);
    setFlash(null);
    try {
      const { synced, waba_id } = await actions.runSyncTemplates();
      setFlash({
        type: 'ok',
        message: `Synced ${synced} template(s) (WABA ${waba_id}).`,
      });
    } catch (e) {
      setFlash({
        type: 'err',
        message: e instanceof ApiError ? e.message : 'Sync failed',
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/whatsapp" className={adminBtnSecondary}>
          ← Overview
        </Link>
        <Link to={`/whatsapp/${tenantId}`} className={adminBtnSecondary}>
          Configure
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-semibold text-slate-900">Meta templates</h1>
        <button type="button" className={adminBtnPrimary} disabled={syncing} onClick={() => void onSync()}>
          {syncing ? 'Syncing…' : 'Sync templates'}
        </button>
      </div>

      {flash ? (
        <div
          className={
            flash.type === 'ok'
              ? 'rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900'
              : 'rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900'
          }
        >
          {flash.message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">{error}</div>
      ) : null}

      <ResourcePanel title="Synced templates (UTILITY + AUTHENTICATION)">
        <div className="p-2">
          {loading ? <p className="text-xs text-slate-500">Loading…</p> : <TemplatesTable rows={templates} />}
        </div>
      </ResourcePanel>
    </div>
  );
}
