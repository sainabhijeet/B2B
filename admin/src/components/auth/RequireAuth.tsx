import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiGet } from '@/lib/apiClient';
import { clearAuth } from '@/lib/authStorage';

type AdminSession = {
  role: string;
  tenantId: string | null;
};

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_SUPPORT']);

export function RequireAuth() {
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'authenticated' | 'anonymous'>('checking');
  useEffect(() => {
    let active = true;
    apiGet<{ data: AdminSession }>('/auth/session')
      .then((response) => {
        if (!active) return;
        if (!ADMIN_ROLES.has(response.data.role) || response.data.tenantId !== null) {
          clearAuth();
          setState('anonymous');
          return;
        }
        setState('authenticated');
      })
      .catch(() => {
        if (active) setState('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);
  if (state === 'checking') return null;
  if (state === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
