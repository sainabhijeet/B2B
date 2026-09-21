import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '@/lib/apiClient';
import { getApiOrigin } from '@/lib/apiBase';
import type { AdminLoginResponse } from '@/lib/apiTypes';
import { setDeviceId, setTokens, ensureDeviceId } from '@/lib/authStorage';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceIdInput] = useState(() => ensureDeviceId());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resolvedDevice = deviceId.trim() || ensureDeviceId();
      setDeviceId(resolvedDevice);
      const res = await apiPost<AdminLoginResponse>(
        '/auth/admin/login',
        { email: email.trim(), password, deviceId: resolvedDevice },
        { skipAuth: true },
      );
      if (!res.accessToken || !res.refreshToken) {
        setError('Unexpected login response.');
        return;
      }
      setTokens(res.accessToken, res.refreshToken);
      navigate(from.startsWith('/login') ? '/' : from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const origin = getApiOrigin();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Super Admin Login</h1>
        <p className="mt-1 text-sm text-slate-600">
          API: <span className="font-mono text-xs">{origin}</span>
          <span className="text-slate-400"> · </span>
          <span className="font-mono text-xs">POST /api/v1/auth/admin/login</span>
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="deviceId">
              Device ID
            </label>
            <input
              id="deviceId"
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="stable client id (refresh token is bound to this)"
              value={deviceId}
              onChange={(e) => setDeviceIdInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/forgot-password" className="text-indigo-600 hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-indigo-600 hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
