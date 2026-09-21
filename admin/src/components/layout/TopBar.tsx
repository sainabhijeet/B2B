import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Search } from 'lucide-react';
import { clearAuth } from '@/lib/authStorage';
import { getDeviceId } from '@/lib/authStorage';
import { apiPost } from '@/lib/apiClient';

export function TopBar() {
  const navigate = useNavigate();

  async function signOut() {
    try {
      await apiPost('/auth/logout', { deviceId: getDeviceId() ?? 'web-admin' });
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="relative max-w-sm flex-1 sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Filter records…"
          className="w-full rounded-sm border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
          disabled
          title="Connect to search API later"
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded-sm p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  );
}
