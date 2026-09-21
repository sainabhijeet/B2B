import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { Link } from 'react-router-dom';
import { TenantDetailProvider, useTenantDetail } from '@/components/tenants/TenantDetailContext';
import { ApiError } from '@/lib/apiClient';
import { createTenantHandoff } from '@/lib/tenantsApi';

const tabs: { path: string; label: string }[] = [
  { path: 'overview', label: 'Business' },
  { path: 'subscription', label: 'Subscription' },
  { path: 'usage', label: 'Usage' },
  { path: 'domains', label: 'Domains' },
  { path: 'builds', label: 'App builds' },
  { path: 'database', label: 'Database' },
  { path: 'whatsapp', label: 'WhatsApp' },
  { path: 'features', label: 'Feature flags' },
  { path: 'support', label: 'Support' },
  { path: 'activity', label: 'Activity' },
  { path: 'danger', label: 'Danger zone' },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
    suspended: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    pending: 'bg-sky-50 text-sky-800 ring-sky-600/20',
    blocked: 'bg-red-50 text-red-800 ring-red-600/20',
  };
  return map[status] ?? 'bg-slate-50 text-slate-700 ring-slate-600/20';
}

function TenantDetailLayoutInner() {
  const { tenantId } = useParams();
  const { detail, loading, error, reload } = useTenantDetail();
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  async function openDistributorPanel() {
    if (!tenantId) return;
    const popup = window.open('', '_blank');
    if (!popup) {
      setHandoffError('Popup was blocked. Allow popups and try again.');
      return;
    }
    popup.opener = null;
    popup.document.title = 'Opening distributor panel…';
    setHandoffLoading(true);
    setHandoffError(null);
    try {
      const deviceId = `admin-handoff-${crypto.randomUUID()}`;
      const tokens = await createTenantHandoff(tenantId, deviceId);
      const base = (import.meta.env.VITE_DISTRIBUTOR_PANEL_URL?.trim() || 'http://localhost:5174').replace(/\/$/, '');
      const fragment = new URLSearchParams({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        device_id: deviceId,
      });
      popup.location.replace(`${base}/admin-handoff#${fragment.toString()}`);
    } catch (cause) {
      popup.close();
      setHandoffError(cause instanceof ApiError ? cause.message : 'Could not open distributor panel.');
    } finally {
      setHandoffLoading(false);
    }
  }

  const title = detail?.name ?? (loading ? 'Loading…' : `Tenant ${tenantId ?? '—'}`);
  const description = detail
    ? [`ID · ${detail.id}`, detail.plan ? `Plan · ${detail.plan.name}` : null].filter(Boolean).join(' · ')
    : tenantId
      ? `ID · ${tenantId}`
      : undefined;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap gap-2">
            {tenantId ? (
              <Link to={`/products?tenantId=${encodeURIComponent(tenantId)}`} className={adminBtnSecondary}>
                Manage catalog
              </Link>
            ) : null}
            {tenantId ? (
              <button
                type="button"
                className={adminBtnSecondary}
                disabled={handoffLoading || detail?.status !== 'active'}
                onClick={() => void openDistributorPanel()}
              >
                {handoffLoading ? 'Opening…' : 'Login as distributor'}
              </button>
            ) : null}
            <button type="button" className={adminBtnSecondary} disabled={loading} onClick={() => void reload()}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link to="/tenants" className={adminBtnSecondary}>
              ← All tenants
            </Link>
          </div>
        }
      />

      {error && !detail ? (
        <div className="mb-3 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {error}{' '}
          <button type="button" className="font-semibold text-indigo-700 underline" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      ) : null}
      {handoffError ? (
        <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {handoffError}
        </div>
      ) : null}

      {detail ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusBadge(detail.status)}`}
          >
            {detail.status}
          </span>
          <span className="text-xs text-slate-600">{detail.owner?.email ?? '—'}</span>
          <span className="font-mono text-[10px] text-slate-500">slug · {detail.slug}</span>
        </div>
      ) : loading ? (
        <p className="mb-3 text-xs text-slate-500">Loading tenant details…</p>
      ) : null}

      <div className="-mx-1 mb-4 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-px px-1">
          {tabs.map((t) => (
            <NavLink
              key={t.path}
              to={`/tenants/${tenantId}/${t.path}`}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}

export function TenantDetailLayout() {
  return (
    <TenantDetailProvider>
      <TenantDetailLayoutInner />
    </TenantDetailProvider>
  );
}
