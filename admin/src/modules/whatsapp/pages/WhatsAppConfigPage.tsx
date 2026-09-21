import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { TemplateMappingsEditor } from '../components/TemplateMappingsEditor';
import { WhatsAppConfigForm } from '../components/WhatsAppConfigForm';
import { useWhatsApp } from '../hooks/useWhatsApp';

type Flash = { type: 'ok' | 'err'; message: string } | null;

export function WhatsAppConfigPage() {
  const { tenantId } = useParams();
  const { config, loading, error, actions } = useWhatsApp(tenantId);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [flash, setFlash] = useState<Flash>(null);

  if (!tenantId) {
    return <p className="text-xs text-slate-600">Missing tenant id.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/whatsapp" className={adminBtnSecondary}>
          ← Overview
        </Link>
        <Link to={`/whatsapp/${tenantId}/templates`} className={adminBtnSecondary}>
          Templates
        </Link>
        <Link to="/whatsapp/health" className={adminBtnSecondary}>
          Health
        </Link>
      </div>

      <h1 className="text-sm font-semibold text-slate-900">WhatsApp configuration</h1>

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

      <ResourcePanel title="Line settings">
        {loading && !config ? (
          <p className="p-3 text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="p-2">
            <WhatsAppConfigForm
              initial={config}
              saving={saving}
              testing={testing}
              testResult={testResult}
              onSave={async (payload) => {
                setSaving(true);
                setFlash(null);
                try {
                  await actions.updateConfig(payload);
                  setFlash({ type: 'ok', message: 'Configuration saved.' });
                } catch (e) {
                  setFlash({
                    type: 'err',
                    message: e instanceof ApiError ? e.message : 'Save failed',
                  });
                } finally {
                  setSaving(false);
                }
              }}
              onTestConnection={async () => {
                setTesting(true);
                setTestResult('idle');
                setFlash(null);
                try {
                  const { ok } = await actions.runTestConnection();
                  setTestResult(ok ? 'ok' : 'fail');
                  setFlash({
                    type: ok ? 'ok' : 'err',
                    message: ok ? 'Test connection succeeded.' : 'Test connection failed.',
                  });
                } catch (e) {
                  setTestResult('fail');
                  setFlash({
                    type: 'err',
                    message: e instanceof ApiError ? e.message : 'Test failed',
                  });
                } finally {
                  setTesting(false);
                }
              }}
            />
          </div>
        )}
      </ResourcePanel>

      <ResourcePanel title="Logical key → Meta template name (tenant overrides)">
        <div className="p-2">
          <TemplateMappingsEditor tenantId={tenantId} />
        </div>
      </ResourcePanel>
    </div>
  );
}
