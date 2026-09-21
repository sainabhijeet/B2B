import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2, LogOut, Search } from "lucide-react";
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/api/notificationsApi";
import { clearAuth, getDeviceId, getRefreshToken } from "@/lib/authStorage";
import { apiPost } from "@/lib/apiClient";

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TopBar() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCount = useCallback(() => {
    void getUnreadNotificationCount().then(setUnread).catch(() => undefined);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listNotifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const timer = window.setInterval(loadCount, 30_000);
    return () => window.clearInterval(timer);
  }, [loadCount]);

  useEffect(() => {
    if (open) void loadItems();
  }, [open, loadItems]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  async function openNotification(item: AppNotification) {
    if (!item.readAt) {
      await markNotificationRead(item.id).catch(() => undefined);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
      setUnread((value) => Math.max(0, value - 1));
    }
    setOpen(false);
    if (item.actionUrl?.startsWith("/")) navigate(item.actionUrl);
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    setUnread(0);
    setItems((current) => current.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
  }

  async function signOut() {
    try {
      await apiPost("/auth/logout", {
        deviceId: getDeviceId() ?? "web-distributor",
        refreshToken: getRefreshToken() ?? undefined,
      });
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="relative max-w-sm flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input type="search" placeholder="Filter records…" className="w-full rounded-sm border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs outline-none" disabled />
      </div>
      <div className="flex items-center gap-1">
        <div className="relative" ref={dropdownRef}>
          <button type="button" onClick={() => setOpen((value) => !value)} className="relative rounded-sm p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}>
            <Bell className="h-4 w-4" />
            {unread > 0 ? <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 99 ? "99+" : unread}</span> : null}
          </button>
          {open ? (
            <div className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div><p className="text-sm font-semibold text-slate-900">Notifications</p><p className="text-xs text-slate-500">{unread} unread</p></div>
                {unread ? <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button> : null}
              </div>
              <div className="max-h-[28rem] overflow-y-auto">
                {loading ? <div className="flex items-center justify-center p-8 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div> : null}
                {error ? <div className="p-4 text-sm text-red-700">{error}</div> : null}
                {!loading && !error && !items.length ? <div className="p-8 text-center text-sm text-slate-500">No notifications yet.</div> : null}
                {!loading && !error ? items.map((item) => (
                  <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${item.readAt ? "bg-white" : "bg-emerald-50/60"}`}>
                    <span className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-slate-200" : "bg-emerald-600"}`} />
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-600">{item.message}</span><span className="mt-1 block text-[11px] text-slate-400">{relativeTime(item.createdAt)}</span></span>
                    </span>
                  </button>
                )) : null}
              </div>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={signOut} className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
      </div>
    </header>
  );
}
