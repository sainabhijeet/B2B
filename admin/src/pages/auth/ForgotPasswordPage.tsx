import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-600">Skeleton — wire to platform reset flow.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder="email"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white"
          >
            Send reset link
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-indigo-600 hover:underline">
            ← Login
          </Link>
        </p>
      </div>
    </div>
  );
}
