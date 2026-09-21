import { refreshCustomerTokensFromCookies } from "@/lib/server-customer-token-refresh";

/** Rotates JWT cookies using Nest `POST /api/v1/auth/refresh` (refresh + deviceId cookies). */
export async function POST() {
  const ok = await refreshCustomerTokensFromCookies();
  if (!ok) {
    return Response.json({ success: false, message: "Refresh failed or session missing." }, { status: 401 });
  }
  return Response.json({ success: true });
}
