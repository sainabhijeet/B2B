import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAuthSession, setDeviceId, setTokens } from "@/lib/authStorage";
import { getRoleFromAccessToken, getTenantIdFromAccessToken } from "@/lib/jwtParse";

export function AdminHandoffPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [handoff] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return {
      accessToken: hash.get("access_token"),
      refreshToken: hash.get("refresh_token"),
      deviceId: hash.get("device_id"),
    };
  });

  useEffect(() => {
    window.history.replaceState({}, document.title, "/admin-handoff");
    const { accessToken, refreshToken, deviceId } = handoff;
    if (!accessToken || !refreshToken || !deviceId) {
      setError("This admin handoff link is incomplete. Start it again from Super Admin.");
      return;
    }
    const tenantId = getTenantIdFromAccessToken(accessToken);
    const role = getRoleFromAccessToken(accessToken);
    if (!tenantId || !role) {
      setError("This admin handoff token is invalid.");
      return;
    }
    setDeviceId(deviceId);
    setTokens(accessToken, refreshToken);
    setAuthSession({ sub: "", tenantId, role });
    navigate("/catalog/products", { replace: true });
  }, [handoff, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Opening distributor catalog</h1>
        <p className={`mt-2 text-sm ${error ? "text-red-700" : "text-slate-600"}`}>
          {error ?? "Verifying the Super Admin handoff…"}
        </p>
      </div>
    </main>
  );
}
