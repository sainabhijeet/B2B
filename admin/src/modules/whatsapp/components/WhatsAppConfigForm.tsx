import { useEffect, useState } from 'react';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { PlatformWhatsappConfig, UpdateWhatsappConfigPayload } from '../api/whatsappApi';

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full max-w-xl rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900';

type Props = {
  initial: PlatformWhatsappConfig | null;
  saving: boolean;
  testing: boolean;
  testResult: 'idle' | 'ok' | 'fail';
  onSave: (payload: UpdateWhatsappConfigPayload) => Promise<void>;
  onTestConnection: () => Promise<void>;
};

export function WhatsAppConfigForm({
  initial,
  saving,
  testing,
  testResult,
  onSave,
  onTestConnection,
}: Props) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [useOwnToken, setUseOwnToken] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [verifyToken, setVerifyToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    setPhoneNumberId(initial.phone_number_id ?? '');
    setWabaId(initial.waba_id ?? '');
    setAccessToken('');
    setUseOwnToken(initial.use_own_token === true);
    setIsActive(initial.is_active === true);
    setVerifyToken('');
    setAppSecret('');
    setFormError(null);
  }, [initial]);

  function buildPayload(): UpdateWhatsappConfigPayload {
    const pid = phoneNumberId.trim();
    if (!pid) {
      throw new Error('Phone Number ID is required.');
    }
    if (useOwnToken && !accessToken.trim() && !initial?.access_token_configured) {
      throw new Error('Access token is required when Use own token is enabled.');
    }
    const payload: UpdateWhatsappConfigPayload = {
      phoneNumberId: pid,
      whatsappBusinessAccountId: wabaId.trim() || undefined,
      useOwnToken,
      isActive,
      validateTokenOnSave: false,
    };
    if (accessToken.trim()) payload.accessToken = accessToken.trim();
    if (useOwnToken) {
      if (verifyToken.trim()) payload.webhookVerifyToken = verifyToken.trim();
      if (appSecret.trim()) payload.appSecret = appSecret.trim();
    }
    return payload;
  }

  async function handleSave() {
    setFormError(null);
    try {
      const payload = buildPayload();
      await onSave(payload);
      setAccessToken('');
      setVerifyToken('');
      setAppSecret('');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-4 rounded-sm border border-slate-200 bg-white p-4">
      {formError ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-800">{formError}</div>
      ) : null}
      <div className="grid max-w-xl gap-3">
        <div>
          <label className={lbl} htmlFor="wa-phone">
            Phone number ID
          </label>
          <input
            id="wa-phone"
            className={inp}
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={lbl} htmlFor="wa-waba">
            WABA ID
          </label>
          <input
            id="wa-waba"
            className={inp}
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={lbl} htmlFor="wa-token">
            Access token
            {initial?.access_token_configured ? (
              <span className="ml-1 font-normal normal-case text-slate-400">(leave blank to keep)</span>
            ) : null}
          </label>
          <input
            id="wa-token"
            type="password"
            className={inp}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={initial?.access_token_configured ? '••••••••' : ''}
            autoComplete="new-password"
          />
          {initial && !useOwnToken && !initial.graph_api_token_configured ? (
            <p className="mt-1 max-w-xl text-[10px] text-red-700">
              No platform Graph token in API env. Set <code className="rounded bg-slate-100 px-0.5">WHATSAPP_SHARED_TOKEN</code> or{' '}
              <code className="rounded bg-slate-100 px-0.5">WHATSAPP_CLOUD_ACCESS_TOKEN</code>, or enable &quot;Use own
              token&quot; and save a line access token.
            </p>
          ) : null}
          {initial && !useOwnToken && initial.graph_api_token_configured ? (
            <p className="mt-1 max-w-xl text-[10px] text-slate-500">
              Meta calls use the platform token from env (shared or cloud access token). Leave the field blank unless
              you switch to &quot;Use own token&quot;.
            </p>
          ) : null}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
          <input
            type="checkbox"
            checked={useOwnToken}
            onChange={(e) => setUseOwnToken(e.target.checked)}
            className="rounded border-slate-300"
          />
          Use own token
        </label>
        {useOwnToken ? (
          <>
            <div>
              <label className={lbl} htmlFor="wa-verify">
                Webhook verify token
              </label>
              <input
                id="wa-verify"
                type="password"
                className={inp}
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="Leave blank to keep stored value"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={lbl} htmlFor="wa-secret">
                App secret
              </label>
              <input
                id="wa-secret"
                type="password"
                className={inp}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="Leave blank to keep stored value"
                autoComplete="new-password"
              />
            </div>
          </>
        ) : null}
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300"
          />
          Active
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={adminBtnPrimary} disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className={adminBtnSecondary} disabled={testing} onClick={() => void onTestConnection()}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        {testResult === 'ok' ? (
          <span className="text-xs font-medium text-emerald-700">Connected</span>
        ) : null}
        {testResult === 'fail' ? (
          <span className="text-xs font-medium text-red-700">Failed</span>
        ) : null}
      </div>
    </div>
  );
}
