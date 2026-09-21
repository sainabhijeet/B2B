import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { apiGet } from "@/lib/apiClient";
import { clearAuth, setAuthSession, type AuthSession } from "@/lib/authStorage";

export function RequireAuth() {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "authenticated" | "anonymous">("checking");
  useEffect(() => {
    let active = true;
    apiGet<{ data: AuthSession }>("/auth/session")
      .then((response) => {
        if (!active) return;
        if (!response.data.tenantId || !["OWNER", "MANAGER", "STAFF"].includes(response.data.role)) {
          clearAuth();
          setState("anonymous");
          return;
        }
        setAuthSession(response.data);
        setState("authenticated");
      })
      .catch(() => {
        if (!active) return;
        setAuthSession(null);
        setState("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);
  if (state === "checking") return null;
  if (state === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
