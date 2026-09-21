import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getAuthSession } from "@/lib/authStorage";
import { fetchDistributorOnboardingStatus } from "@/lib/distributorOnboardingApi";

/** Sends distributors to `/onboarding` until server onboarding status is `complete`. */
export function OnboardingGate() {
  const tenantId = getAuthSession()?.tenantId ?? null;
  const [loading, setLoading] = useState(!!tenantId);
  const [complete, setComplete] = useState(!tenantId);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      setComplete(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchDistributorOnboardingStatus()
      .then((s) => {
        if (!cancelled) setComplete(s.status === "complete");
      })
      .catch(() => {
        if (!cancelled) setComplete(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!tenantId) return <Outlet />;
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Loading…
      </div>
    );
  }
  if (!complete) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}
