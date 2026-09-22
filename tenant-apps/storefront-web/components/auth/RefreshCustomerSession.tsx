"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/storefront/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/** Recover an expired access token through a Route Handler before showing sign-in. */
export default function RefreshCustomerSession({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void refreshSession()
      .then((ok) => {
        if (!active) return;
        setChecking(false);
        if (ok) router.refresh();
      });
    return () => { active = false; };
  }, [enabled, router]);

  if (enabled && checking) {
    return <main role="status" className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">Checking your session…</main>;
  }
  return <>{children}</>;
}
