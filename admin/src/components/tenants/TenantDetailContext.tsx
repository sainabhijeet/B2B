import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '@/lib/apiClient';
import { fetchTenantDetail, type TenantDetailFromApi } from '@/lib/tenantsApi';

type TenantDetailContextValue = {
  detail: TenantDetailFromApi | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const TenantDetailContext = createContext<TenantDetailContextValue | null>(null);

export function TenantDetailProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useParams();
  const [detail, setDetail] = useState<TenantDetailFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }
    setError(null);
    setLoading(true);
    setDetail(null);
    try {
      const d = await fetchTenantDetail(tenantId);
      setDetail(d);
    } catch (e) {
      setDetail(null);
      setError(e instanceof ApiError ? e.message : 'Failed to load tenant.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value: TenantDetailContextValue = {
    detail,
    loading,
    error,
    reload,
  };

  return <TenantDetailContext.Provider value={value}>{children}</TenantDetailContext.Provider>;
}

export function useTenantDetail(): TenantDetailContextValue {
  const c = useContext(TenantDetailContext);
  if (!c) throw new Error('useTenantDetail must be used inside TenantDetailProvider');
  return c;
}

export function TenantDetailLoadingGate({
  children,
}: {
  children: (detail: TenantDetailFromApi) => ReactNode;
}) {
  const { detail, loading, error } = useTenantDetail();
  if (loading && !detail) {
    return <div className="px-3 py-10 text-center text-xs text-slate-500">Loading tenant…</div>;
  }
  if (!detail) {
    return (
      <div className="px-3 py-10 text-center text-xs text-amber-900">
        {error ?? 'Tenant not found.'}
      </div>
    );
  }
  return <>{children(detail)}</>;
}
