import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiGet } from '@/lib/apiClient';

export function RequireAuth() {
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'authenticated' | 'anonymous'>('checking');
  useEffect(() => {
    let active = true;
    apiGet('/auth/session')
      .then(() => {
        if (active) setState('authenticated');
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
