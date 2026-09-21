import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
import { ApiError } from '@/lib/apiClient';
import {
  disableTenantWhatsapp,
  enableTenantWhatsapp,
  fetchTenantWhatsappStatus,
} from '@/lib/tenantWhatsappPlatformApi';

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full max-w-xl rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900';

export function TenantWhatsappTab() {
  const { tenantId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [useOwnToken, setUseOwnToken] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [webhookVerified, setWebhookVerified] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const s = await fetchTenantWhatsappStatus(tenantId);
      setEnabled(s.isActive);
      setPhoneNumberId(s.phoneNumberId ?? '');
      setUseOwnToken(s.useOwnToken === true);
      setWebhookVerified(s.webhookVerified);
      setAccessToken('');
      setVerifyToken('');
      setAppSecret('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load WhatsApp status');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!tenantId) return;
    setSaving(true);
    setError(null);
    try {
      if (!enabled) {
        const s = await disableTenantWhatsapp(tenantId);
        setEnabled(s.isActive);
        setPhoneNumberId(s.phoneNumberId ?? '');
        setUseOwnToken(s.useOwnToken === true);
        setWebhookVerified(s.webhookVerified);
        setAccessToken('');
        setVerifyToken('');
        setAppSecret('');
        return;
      }
      const pid = phoneNumberId.trim();
      if (!pid) {
        setError('Phone Number ID is required when WhatsApp is enabled.');
        return;
      }
      const ownExtras =
        useOwnToken &&
        (accessToken.trim() || verifyToken.trim() || appSecret.trim())
          ? {
              ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
              ...(verifyToken.trim() ? { verifyToken: verifyToken.trim() } : {}),
              ...(appSecret.trim() ? { appSecret: appSecret.trim() } : {}),
            }
          : {};
      const s = await enableTenantWhatsapp(tenantId, {
        phoneNumberId: pid,
        useOwnToken,
        ...ownExtras,
      });
      setEnabled(s.isActive);
      setPhoneNumberId(s.phoneNumberId ?? '');
      setUseOwnToken(s.useOwnToken === true);
      setWebhookVerified(s.webhookVerified);
      setAccessToken('');
      setVerifyToken('');
      setAppSecret('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!tenantId) {
    return (
      <div className="px-3 py-6 text-xs text-amber-800">Missing tenant id in URL. Open this tab from a tenant page.</div>
    );
  }

  return (
    <TenantDetailLoadingGate>
      {() => (
        <div className="space-y-4">
          <ResourcePanel title="WhatsApp (platform)">
            <div className="space-y-4 p-3">
              <p className="text-xs text-slate-600">
                <strong>Phone number ID</strong> tenant line se map hota hai. Default par Graph token{' '}
                <code className="text-[10px]">WHATSAPP_SHARED_TOKEN</code> /{' '}
                <code className="text-[10px]">WHATSAPP_CLOUD_ACCESS_TOKEN</code> (.env) use hota hai. Jab{' '}
                <strong>Use own token</strong> chalu ho, tab hi niche Meta access token, webhook verify token, aur app
                secret dikhenge (`.env` ke <code className="text-[10px]">WHATSAPP_VERIFY_TOKEN</code> /{' '}
                <code className="text-[10px]">WHATSAPP_APP_SECRET</code> jaisa role, per line DB mein). Pehli baar teeno
                bharo; baad mein sirf jo change karna ho wahi bhejo. Disable par row delete nahi.
              </p>

              {error ? (
                <p className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-900">{error}</p>
              ) : null}
              {loading ? <p className="text-xs text-slate-500">Loading…</p> : null}

              {!loading ? (
                <>
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                    />
                    WhatsApp enabled
                  </label>

                  <div>
                    <label className={lbl}>Phone number ID (Meta)</label>
                    <input
                      className={inp}
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder="From Meta Business Suite"
                      disabled={!enabled}
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={useOwnToken}
                      onChange={(e) => setUseOwnToken(e.target.checked)}
                      disabled={!enabled}
                    />
                    Use own token (store in DB for this line)
                  </label>

                  {enabled && useOwnToken ? (
                    <div className="space-y-3">
                      <div>
                        <label className={lbl}>Access token (Meta Graph)</label>
                        <textarea
                          className={`${inp} min-h-[5rem] font-mono`}
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder="Required first time; leave empty to keep existing"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className={lbl}>Webhook verify token (Meta → Verify token)</label>
                        <input
                          className={`${inp} font-mono`}
                          value={verifyToken}
                          onChange={(e) => setVerifyToken(e.target.value)}
                          placeholder="Same as WHATSAPP_VERIFY_TOKEN for this app — required first time"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className={lbl}>App secret (Meta app)</label>
                        <input
                          type="password"
                          className={`${inp} font-mono`}
                          value={appSecret}
                          onChange={(e) => setAppSecret(e.target.value)}
                          placeholder="Same as WHATSAPP_APP_SECRET — required first time"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500">Webhook verified (first inbound POST):</span>
                    <span
                      className={
                        webhookVerified ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'
                      }
                    >
                      {webhookVerified ? 'Yes' : 'Not yet'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" className={adminBtnPrimary} disabled={saving} onClick={() => void onSave()}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className={adminBtnSecondary} disabled={loading} onClick={() => void load()}>
                      Reload
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </ResourcePanel>
        </div>
      )}
    </TenantDetailLoadingGate>
  );
}
