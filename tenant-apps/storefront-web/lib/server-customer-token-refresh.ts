import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-origin";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_DEVICE_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
} from "@/lib/customer-session-cookies";

type RefreshPayload = {
  accessToken?: string;
  refreshToken?: string;
};

const cookieBase = () =>
  ({
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }) as const;

/**
 * Rotates access (and refresh) tokens via Nest `POST /auth/refresh`.
 * Call from Route Handlers or RSC helpers (same request as `cookies().set`).
 */
export async function refreshCustomerTokensFromCookies(): Promise<boolean> {
  const jar = await cookies();
  const refreshToken = jar.get(CUSTOMER_REFRESH_COOKIE)?.value;
  const deviceId = jar.get(CUSTOMER_DEVICE_COOKIE)?.value;
  if (!refreshToken?.trim() || !deviceId?.trim()) return false;

  const base = apiBaseUrl();
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, deviceId }),
    cache: "no-store",
  });
  if (!res.ok) return false;

  let parsed: RefreshPayload;
  try {
    parsed = (await res.json()) as RefreshPayload;
  } catch {
    return false;
  }
  if (!parsed.accessToken) return false;

  const common = cookieBase();
  jar.set(CUSTOMER_ACCESS_COOKIE, parsed.accessToken, { ...common, maxAge: 60 * 60 * 12 });
  if (parsed.refreshToken) {
    jar.set(CUSTOMER_REFRESH_COOKIE, parsed.refreshToken, { ...common, maxAge: 60 * 60 * 24 * 30 });
  }
  return true;
}
